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
    const { statut, commentaire } = await req.json();

    // Vérifier que le plan existe
    const planExistant = await prisma.planCorrection.findUnique({
      where: { id },
      select: { assigneA: true, statut: true, idVulnerabilite: true }
    });

    if (!planExistant) {
      return NextResponse.json({ error: "Plan non trouvé" }, { status: 404 });
    }

    // Autorisation : Technicien ne peut modifier que ses propres plans (sauf Admin)
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
        ...(commentaire !== undefined && { commentaire }),
        updatedAt: new Date(),
      },
      include: {
        vulnerabilite: {
          select: {
            id: true,
            titre: true,
            severite: true,
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
    });

    // Mise à jour automatique du statut de la vulnérabilité
    if (statut === 'TERMINE' || statut === 'VERIFIE') {
      await prisma.vulnerabilite.update({
        where: { id: plan.idVulnerabilite },
        data: { 
          statut: 'CORRIGEE',
          updatedAt: new Date()
        },
      });
    }

    // Si rejeté, on peut remettre la vulnérabilité en "OUVERTE"
    if (statut === 'REJETEE') {
      await prisma.vulnerabilite.update({
        where: { id: plan.idVulnerabilite },
        data: { 
          statut: 'OUVERTE',
          updatedAt: new Date()
        },
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
      error: "Erreur lors de la mise à jour du plan",
      details: error.message
    }, { status: 500 });
  }
}