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

    // Filtrage pour le Technicien
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
      orderBy: {
        createdAt: 'desc'
      },
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
    return NextResponse.json(
      { success: false, error: "Erreur serveur lors de la récupération des plans" },
      { status: 500 }
    );
  }
}

// POST - Création d'un plan de correction (Admin / Auditeur)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();

    const plan = await prisma.planCorrection.create({
      data: {
        idVulnerabilite: body.idVulnerabilite,
        assigneA: null,        // ← Correction principale
        priorite: body.priorite || 'MOYENNE',
        dateEcheance: new Date(body.dateEcheance),
        statut: body.statut || StatutPlan.A_FAIRE,
        commentaire: body.commentaire || undefined,
      },
      include: {
        vulnerabilite: {
          select: {
            id: true,
            titre: true,
            severite: true,
            scoreCVSS: true,
            cveId: true,
            statut: true
          }
        },
        assigne: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: plan
    }, { status: 201 });

  } catch (error) {
    console.error("Erreur POST /api/plans-correction:", error);
    return NextResponse.json({
      success: false,
      error: "Erreur serveur lors de la création du plan"
    }, { status: 500 });
  }
}