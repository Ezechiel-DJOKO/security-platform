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
      include: {
        vulnerabilite: {
          select: {
            id: true,
            titre: true,
            severite: true,
            scoreCVSS: true,
            cveId: true,
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

    // Calcul dynamique du statut affiché (surtout pour EN_RETARD)
    const plansAvecRetard = plans.map(plan => {
      const now = new Date();
      const dateEcheance = new Date(plan.dateEcheance);
      
      const estEnRetard = 
        !['TERMINE', 'VERIFIE', 'ANNULE'].includes(plan.statut) && 
        dateEcheance < now;

      return {
        ...plan,
        // On ajoute un champ calculé pour le frontend
        estEnRetard,
        // Statut affiché (utile pour la table et les stats)
        statutAffiche: estEnRetard ? 'EN_RETARD' : plan.statut,
      };
    });

    return NextResponse.json(plansAvecRetard);
  } catch (error) {
    console.error("Erreur GET /plans-correction:", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la récupération des plans" },
      { status: 500 }
    );
  }
}

// POST (tu peux le garder tel quel, juste une petite amélioration)
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
        assigneA: body.assigneA,
        priorite: body.priorite,
        dateEcheance: new Date(body.dateEcheance),
        statut: body.statut || StatutPlan.A_FAIRE,
        commentaire: body.commentaire || undefined,
        dateResolution: body.dateResolution ? new Date(body.dateResolution) : null,
      },
      include: {
        vulnerabilite: { select: { id: true, titre: true, severite: true, scoreCVSS: true, cveId: true } },
        assigne: { select: { id: true, nom: true, prenom: true, email: true } }
      }
    });

    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    console.error("Erreur POST /plans-correction:", error);
    return NextResponse.json({ error: "Erreur serveur lors de la création" }, { status: 500 });
  }
}