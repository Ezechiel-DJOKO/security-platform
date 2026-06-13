import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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