// src/app/api/plans-correction/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { StatutPlan } from '@prisma/client';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { id } = await params;
    const { statut, assigneA, dateEcheance, commentaire } = await req.json();

    // Mise à jour sécurisée
    const plan = await prisma.planCorrection.update({
      where: { id },
      data: {
        ...(statut && { statut: statut as StatutPlan }),
        ...(assigneA !== undefined && { assigneA }),
        ...(dateEcheance && { dateEcheance: new Date(dateEcheance) }),
        ...(commentaire && { commentaire }),
        // Mise à jour automatique de la date de résolution si corrigé
        ...(statut === StatutPlan.TERMINE && { dateResolution: new Date() }),
      },
      include: {
        vulnerabilite: true,
        assigne: {
          select: { nom: true, prenom: true, email: true }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: "Plan mis à jour avec succès",
      plan
    });

  } catch (error: any) {
    console.error("Erreur PATCH plan:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du plan", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { id } = await params;

    await prisma.planCorrection.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: "Plan supprimé avec succès"
    });

  } catch (error: any) {
    console.error("Erreur DELETE plan:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du plan" },
      { status: 500 }
    );
  }
}