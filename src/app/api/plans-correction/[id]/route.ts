import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { StatutPlan } from '@prisma/client';

async function generateVerificationReport(planId: string, superviseurId: string) {
  try {
    const plan = await prisma.planCorrection.findUnique({
      where: { id: planId },
      include: { vulnerabilite: true, assigne: true }
    });

    if (!plan?.vulnerabilite) return;

    const titre = `Vérification Correction - ${plan.vulnerabilite.titre.substring(0, 70)}${
      plan.vulnerabilite.titre.length > 70 ? '...' : ''
    }`;

    await prisma.rapportAudit.create({
      data: {
        generePar: superviseurId,
        idActif: plan.vulnerabilite.idScan
          ? (await prisma.scan.findUnique({ 
              where: { id: plan.vulnerabilite.idScan }, 
              select: { idActif: true } 
            }))?.idActif || ""
          : "",
        titre,
        description: `Validation de la correction par le superviseur. Statut final : ${plan.statut}`,
        format: 'PDF',
      },
    });
  } catch (err) {
    console.error("Erreur génération rapport automatique:", err);
  }
}

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
    const { statut, priorite, dateEcheance, commentaire, assigneA } = body;

    // Récupération du plan
    const planExistant = await prisma.planCorrection.findUnique({
      where: { id },
      select: {
        createdBy: true,
        assigneA: true,
        statut: true,
        idVulnerabilite: true
      }
    });

    if (!planExistant) {
      return NextResponse.json({ error: "Plan non trouvé" }, { status: 404 });
    }

    const userRole = String(session.user.role || '').toUpperCase().trim();
    const isCreator = planExistant.createdBy === session.user.id;

    // ==================== PERMISSIONS ====================
    let hasPermission = false;

    if (userRole === 'ADMIN') {
      hasPermission = true;
    } 
    else if (userRole === 'AUDITEUR') {
      hasPermission = isCreator;

      // INTERDICTION : L'Auditeur ne peut pas changer ces statuts
      if (statut && ['EN_COURS', 'TERMINE', 'VERIFIE'].includes(statut)) {
        return NextResponse.json({
          error: "Vous n'êtes pas autorisé à démarrer, terminer ou vérifier un plan. Cette action est réservée au Technicien et au Superviseur."
        }, { status: 403 });
      }
    } 
    else if (userRole === 'TECHNICIEN') {
      const isAssigned = planExistant.assigneA === session.user.id;
      hasPermission = isAssigned &&
        ['A_FAIRE', 'EN_COURS'].includes(planExistant.statut) &&
        ['EN_COURS', 'TERMINE'].includes(statut || '');
    } 
    else if (userRole === 'SUPERVISEUR') {
      hasPermission = planExistant.statut === 'TERMINE' && statut === 'VERIFIE';
    }

    if (!hasPermission) {
      return NextResponse.json({
        error: "Vous n'avez pas les permissions nécessaires pour cette action"
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
        ...(assigneA && { assigneA }),
        updatedAt: new Date(),
      },
      include: { vulnerabilite: true, assigne: true }
    });

    // Mise à jour de la vulnérabilité
    if (statut === 'TERMINE' || statut === 'VERIFIE') {
      await prisma.vulnerabilite.update({
        where: { id: plan.idVulnerabilite },
        data: { 
          statut: 'CORRIGEE', 
          dateCorrection: new Date(), 
          updatedAt: new Date() 
        }
      });
    }

    if (statut === 'ANNULE') {
      await prisma.vulnerabilite.update({
        where: { id: plan.idVulnerabilite },
        data: { statut: 'OUVERTE', updatedAt: new Date() }
      });
    }

    // Rapport automatique uniquement pour le superviseur
    if (statut === 'VERIFIE' && userRole === 'SUPERVISEUR') {
      await generateVerificationReport(plan.id, session.user.id);
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
    const userRole = String(session.user.role || '').toUpperCase().trim();

    if (userRole !== 'ADMIN' && userRole !== 'AUDITEUR') {
      return NextResponse.json({
        error: "Vous n'avez pas le droit de supprimer ce plan"
      }, { status: 403 });
    }

    const plan = await prisma.planCorrection.findUnique({
      where: { id },
      select: { idVulnerabilite: true }
    });

    if (!plan) {
      return NextResponse.json({ error: "Plan non trouvé" }, { status: 404 });
    }

    await prisma.planCorrection.delete({ where: { id } });

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