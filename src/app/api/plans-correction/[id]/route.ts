import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Mise à jour d'un plan
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;                    // ← Important : await ici
    const { statut, assigneA, dateEcheance, commentaire } = await req.json();

    const plan = await prisma.planCorrection.update({
      where: { id },
      data: {
        ...(statut && { statut }),
        ...(assigneA !== undefined && { assigneA }),
        ...(dateEcheance && { dateEcheance: new Date(dateEcheance) }),
        ...(commentaire && { commentaire }),
      },
      include: { vulnerabilite: true }
    });

    return NextResponse.json({
      success: true,
      message: "Plan mis à jour avec succès",
      plan
    });
  } catch (error) {
    console.error("Erreur PATCH plan:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du plan" },
      { status: 500 }
    );
  }
}

// Suppression d'un plan
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;                    // ← Important : await ici

    await prisma.planCorrection.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: "Plan supprimé avec succès"
    });
  } catch (error) {
    console.error("Erreur DELETE plan:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du plan" },
      { status: 500 }
    );
  }
}