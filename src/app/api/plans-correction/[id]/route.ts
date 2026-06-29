import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { StatutPlan, StatutVulnerabilite } from '@prisma/client';

// ============================================================
// INCLUDE STANDARD
// ============================================================
const PLAN_INCLUDE = {
  vulnerabilite: {
    select: {
      id: true,
      titre: true,
      severite: true,
      statut: true,
      scoreCVSS: true,
      idActif: true,
      idScan: true,
    }
  },
  assigne: {
    select: { id: true, nom: true, prenom: true, email: true }
  },
  createur: {
    select: { id: true, nom: true, prenom: true }
  },
} as const;

// ============================================================
// VÉRIFICATION DES PERMISSIONS (version finale)
// ============================================================
async function checkPermission(
  userId: string,
  userRole: string,
  planId: string,
  action: 'UPDATE' | 'DELETE',
  newStatut?: string
): Promise<{ allowed: boolean; error?: string }> {
  console.log(`[PERMISSION CHECK] User: ${userId} | Role: ${userRole} | Action: ${action} | NewStatut: ${newStatut}`);

  // ADMIN et AUDITEUR ont plein accès
  if (userRole === 'ADMIN' || userRole === 'AUDITEUR') {
    console.log(`[PERMISSION] ${userRole} → Plein accès`);
    return { allowed: true };
  }

  // TECHNICIEN
  if (userRole === 'TECHNICIEN') {
    const plan = await prisma.planCorrection.findUnique({
      where: { id: planId },
      select: { assigneA: true }
    });

    if (plan && plan.assigneA === userId) {
      // Technicien peut seulement démarrer et terminer
      if (newStatut && !['EN_COURS', 'TERMINE'].includes(newStatut)) {
        return { allowed: false, error: "Les techniciens ne peuvent que démarrer ou terminer un plan." };
      }
      return { allowed: true };
    }
    return { allowed: false, error: "Ce plan ne vous est pas assigné." };
  }

  // SUPERVISEUR
  if (userRole === 'SUPERVISEUR') {
    if (newStatut === 'VERIFIE') return { allowed: true };
    if (action === 'DELETE') {
      return { allowed: false, error: "Les superviseurs ne peuvent pas supprimer des plans." };
    }
    return { allowed: true };
  }

  return { allowed: false, error: 'Rôle non autorisé' };
}

// ============================================================
// GET — Détail d'un plan
// ============================================================
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = await params;

    const plan = await prisma.planCorrection.findUnique({
      where: { id },
      include: PLAN_INCLUDE,
    });

    if (!plan) {
      return NextResponse.json({ error: 'Plan non trouvé' }, { status: 404 });
    }

    const jours = Math.ceil((plan.dateEcheance.getTime() - Date.now()) / 86400000);
    const estEnRetard = !['TERMINE', 'VERIFIE', 'ANNULE'].includes(plan.statut) && jours < 0;

    return NextResponse.json({
      success: true,
      data: {
        ...plan,
        joursRestants: jours,
        estEnRetard,
        urgence: jours < 0 ? 'EN_RETARD' : jours <= 3 ? 'URGENT' : 'NORMAL',
      }
    });

  } catch (err: any) {
    console.error('Erreur GET /api/plans-correction/[id]:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// ============================================================
// PATCH — Mise à jour
// ============================================================
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const permission = await checkPermission(
      session.user.id, 
      session.user.role || '', 
      id, 
      'UPDATE',
      body.statut
    );

    if (!permission.allowed) {
      return NextResponse.json({ error: permission.error }, { status: 403 });
    }

    const planExistant = await prisma.planCorrection.findUnique({
      where: { id },
      select: { idVulnerabilite: true, statut: true }
    });

    if (!planExistant) return NextResponse.json({ error: 'Plan non trouvé' }, { status: 404 });

    const updatedPlan = await prisma.$transaction(async (tx) => {
      const updateData: any = {};

      if (body.statut) updateData.statut = body.statut as StatutPlan;
      if (body.priorite) updateData.priorite = body.priorite;
      if (body.dateEcheance) updateData.dateEcheance = new Date(body.dateEcheance);
      if (body.commentaire !== undefined) updateData.commentaire = body.commentaire;
      if (body.assigneA !== undefined) updateData.assigneA = body.assigneA || null;

      const updated = await tx.planCorrection.update({
        where: { id },
        data: updateData,
        include: PLAN_INCLUDE,
      });

      // Synchronisation vulnérabilité
      if (body.statut === 'TERMINE' || body.statut === 'VERIFIE') {
        await tx.vulnerabilite.update({
          where: { id: planExistant.idVulnerabilite },
          data: {
            statut: StatutVulnerabilite.CORRIGEE,
            dateCorrection: new Date(),
          }
        });
      }

      return updated;
    });

    return NextResponse.json({
      success: true,
      message: 'Plan mis à jour avec succès',
      data: updatedPlan,
    });

  } catch (error: any) {
    console.error('Erreur PATCH /api/plans-correction/[id]:', error);
    return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
  }
}

// ============================================================
// DELETE
// ============================================================
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = await params;

    const permission = await checkPermission(session.user.id, session.user.role || '', id, 'DELETE');
    if (!permission.allowed) {
      return NextResponse.json({ error: permission.error || 'Accès refusé' }, { status: 403 });
    }

    const plan = await prisma.planCorrection.findUnique({
      where: { id },
      select: { idVulnerabilite: true }
    });

    if (!plan) return NextResponse.json({ error: 'Plan non trouvé' }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      await tx.planCorrection.delete({ where: { id } });

      await tx.vulnerabilite.update({
        where: { id: plan.idVulnerabilite },
        data: { statut: StatutVulnerabilite.OUVERTE, assigneA: null }
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Plan supprimé avec succès.'
    });

  } catch (error: any) {
    console.error('Erreur DELETE /api/plans-correction/[id]:', error);
    return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 });
  }
}