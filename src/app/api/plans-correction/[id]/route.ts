import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { StatutPlan } from '@prisma/client';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // ← Correction obligatoire

    const { statut, assigneA, dateEcheance, commentaire } = await req.json();

    const plan = await prisma.planCorrection.update({
      where: { id },
      data: {
        ...(statut && { statut: statut as StatutPlan }),
        ...(assigneA !== undefined && { assigneA }),
        ...(dateEcheance && { dateEcheance: new Date(dateEcheance) }),
        ...(commentaire !== undefined && { commentaire }),
        updatedAt: new Date(),
      },
      include: {
        vulnerabilite: true,
        assigne: true,
      },
    });

    // Mise à jour automatique du statut de la vulnérabilité si le plan est TERMINE ou VERIFIE
    if (statut === 'TERMINE' || statut === 'VERIFIE') {
      await prisma.vulnerabilite.update({
        where: { id: plan.idVulnerabilite },
        data: { statut: 'CORRIGEE' },
      });
    }

    return NextResponse.json({ success: true, plan });
  } catch (error: any) {
    console.error('Erreur PATCH plan:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du plan', details: error.message },
      { status: 500 }
    );
  }
}