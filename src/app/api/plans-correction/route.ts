import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { StatutPlan } from '@prisma/client';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const plans = await prisma.planCorrection.findMany({
      where: {
        vulnerabilite: {
          deletedAt: null
        }
      },
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
        assigne: {                    // ← Relation correcte
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

// POST - Création d'un plan de correction (lors de l'assignation d'une vulnérabilité)
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
        assigneA: body.assigneA,           // ← Important : correspond à ton modèle Prisma
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
        assigne: {                         // ← Important pour le frontend
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