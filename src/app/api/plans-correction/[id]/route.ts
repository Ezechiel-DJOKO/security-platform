import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
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
    const body = await req.json();

    const { statut, priorite, dateEcheance, commentaire } = body;

    // Vérifier que le plan existe
    const planExistant = await prisma.planCorrection.findUnique({
      where: { id },
      select: { 
        assigneA: true, 
        statut: true, 
        idVulnerabilite: true 
      }
    });

    if (!planExistant) {
      return NextResponse.json({ error: "Plan non trouvé" }, { status: 404 });
    }

    // Autorisation : Admin ou Technicien assigné
    const isAdmin = session.user.role === 'ADMIN';
    const isAssigned = planExistant.assigneA === session.user.id;

    if (!isAdmin && !isAssigned) {
      return NextResponse.json({
        error: "Vous n'êtes pas autorisé à modifier ce plan"
      }, { status: 403 });
    }

    // Mise à jour du plan
    const plan = await prisma.planCorrection.update({
      where: { id },
      data: {
        ...(statut && { statut: statut as StatutPlan }),
        ...(priorite && { priorite }),
        ...(dateEcheance && { dateEcheance: new Date(dateEcheance) }),
        ...(commentaire !== undefined && { commentaire }),
        updatedAt: new Date(),
      },
      include: {
        vulnerabilite: true,
        assigne: true
      },
    });

    // Mise à jour automatique du statut de la vulnérabilité
    if (statut === 'TERMINE' || statut === 'VERIFIE') {
      await prisma.vulnerabilite.update({
        where: { id: plan.idVulnerabilite },
        data: { statut: 'CORRIGEE', updatedAt: new Date() }
      });
    }

    // Si le plan est annulé → on remet la vulnérabilité en ouverte
    if (statut === 'ANNULE') {
      await prisma.vulnerabilite.update({
        where: { id: plan.idVulnerabilite },
        data: { statut: 'OUVERTE', updatedAt: new Date() }
      });
    }

    return NextResponse.json({
      success: true,
      message: "Plan mis à jour avec succès",
      plan
    });

  } catch (error: any) {
    console.error('Erreur PATCH /api/plans-correction/[id]:', error);
    return NextResponse.json({
      success: false,
      error: "Erreur lors de la mise à jour du plan"
    }, { status: 500 });
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

    const plan = await prisma.planCorrection.findUnique({
      where: { id },
      select: { assigneA: true, idVulnerabilite: true }
    });

    if (!plan) {
      return NextResponse.json({ error: "Plan non trouvé" }, { status: 404 });
    }

    // Autorisation : Seul l'Admin peut supprimer
    const isAdmin = session.user.role === 'ADMIN';
    if (!isAdmin) {
      return NextResponse.json({
        error: "Seul un administrateur peut supprimer un plan"
      }, { status: 403 });
    }

    // Suppression du plan
    await prisma.planCorrection.delete({
      where: { id }
    });

    // Optionnel : Remettre la vulnérabilité en OUVERTE après suppression
    await prisma.vulnerabilite.update({
      where: { id: plan.idVulnerabilite },
      data: { statut: 'OUVERTE', updatedAt: new Date() }
    });

    return NextResponse.json({
      success: true,
      message: "Plan supprimé avec succès"
    });

  } catch (error: any) {
    console.error('Erreur DELETE /api/plans-correction/[id]:', error);
    return NextResponse.json({
      success: false,
      error: "Erreur lors de la suppression du plan"
    }, { status: 500 });
  }
}