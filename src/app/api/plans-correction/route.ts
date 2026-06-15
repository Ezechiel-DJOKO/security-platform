import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// --- Votre fonction POST existante (inchangée) ---
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { vulnerabiliteId, priorite, assigneA, dateEcheance, description } = body;

    const newPlan = await prisma.planCorrection.create({
      data: {
        idVulnerabilite: vulnerabiliteId,
        priorite,
        assigneA,
        dateEcheance: new Date(dateEcheance),
        statut: 'EN_COURS',
        commentaire: description,
      },
      include: {
        vulnerabilite: true,
      }
    });

    return NextResponse.json(newPlan, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de la création du plan" }, { status: 500 });
  }
}

// --- AJOUT : Fonction GET pour corriger l'erreur 405 et le JSON.parse ---
export async function GET() {
  try {
    const plans = await prisma.planCorrection.findMany({
      include: {
        vulnerabilite: true, // Inclut les détails de la vulnérabilité liée au plan
        // Si vous avez une relation vers l'utilisateur assigné, vous pouvez aussi faire :
        // assigne: true, 
      },
      orderBy: {
        createdAt: 'desc', // Affiche les plus récents en premier
      },
    });

    return NextResponse.json(plans, { status: 200 });
  } catch (error) {
    console.error("Erreur dans GET /api/plans-correction :", error);
    return NextResponse.json({ error: "Erreur lors de la récupération des plans" }, { status: 500 });
  }
}
