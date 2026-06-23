import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { StatutPlan } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mesPlans = searchParams.get('mesPlans') === 'true';

    let whereClause: any = {
      vulnerabilite: {
        deletedAt: null
      }
    };

    // Si le technicien veut voir seulement ses plans
    if (mesPlans && session.user.role === 'TECHNICIEN') {
      whereClause.assigneA = session.user.id;
    }

    const plans = await prisma.planCorrection.findMany({
      where: whereClause,
      include: {
        vulnerabilite: {
          select: {
            id: true,
            titre: true,
            severite: true,
            scoreCVSS: true,
            cveId: true,
            statut: true,
          }
        },
        assigne: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calcul du retard
    const plansAvecRetard = plans.map(plan => {
      const now = new Date();
      const dateEcheance = new Date(plan.dateEcheance);
      const estEnRetard =
        !['TERMINE', 'VERIFIE', 'ANNULE'].includes(plan.statut) &&
        dateEcheance < now;

      return {
        ...plan,
        estEnRetard,
        statutAffiche: estEnRetard ? 'EN_RETARD' : plan.statut,
      };
    });

    return NextResponse.json({
      success: true,
      data: plansAvecRetard,
      count: plansAvecRetard.length
    });

  } catch (error) {
    console.error("Erreur GET /api/plans-correction:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Erreur serveur lors de la récupération des plans" 
    }, { status: 500 });
  }
}

// POST - Création d'un ou plusieurs plans
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Vérification des droits (Admin ou Auditeur uniquement)
    if (!['ADMIN', 'AUDITEUR'].includes(session.user.role as string)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await request.json();

    if (!body.vulnerabiliteIds || body.vulnerabiliteIds.length === 0) {
      return NextResponse.json({ error: "Au moins une vulnérabilité est requise" }, { status: 400 });
    }
    if (!body.assigneA) {
      return NextResponse.json({ error: "Le technicien est obligatoire" }, { status: 400 });
    }
    if (!body.dateEcheance) {
      return NextResponse.json({ error: "La date d'échéance est obligatoire" }, { status: 400 });
    }

    const plansCrees = [];

    for (const idVuln of body.vulnerabiliteIds) {
      const plan = await prisma.planCorrection.create({
        data: {
          idVulnerabilite: idVuln,
          assigneA: body.assigneA,
          priorite: body.priorite || 'HAUTE',
          dateEcheance: new Date(body.dateEcheance),
          statut: StatutPlan.A_FAIRE,
          commentaire: body.description || body.commentaire || undefined,
        },
        include: {
          vulnerabilite: true,
          assigne: true
        }
      });
      plansCrees.push(plan);
    }

    return NextResponse.json({
      success: true,
      data: plansCrees,
      message: `${plansCrees.length} plan(s) de correction créé(s) avec succès`
    }, { status: 201 });

  } catch (error: any) {
    console.error("Erreur POST /api/plans-correction:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Erreur serveur lors de la création du plan" 
    }, { status: 500 });
  }
}