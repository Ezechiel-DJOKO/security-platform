// src/app/api/plans-correction/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { StatutPlan, StatutVulnerabilite } from '@prisma/client';

const PLAN_INCLUDE = {
  vulnerabilite: {
    select: { id: true, titre: true, severite: true, statut: true, scoreCVSS: true }
  },
  assigne: { select: { id: true, nom: true, prenom: true, email: true } },
  createur: { select: { id: true, nom: true, prenom: true, email: true } },
} as const;

// ============================================================
// VÉRIFICATION DES PERMISSIONS (Stricte)
// ============================================================
async function checkPermission(
  userId: string,
  userRole: string,
  planId: string,
  action: 'UPDATE' | 'DELETE',
  newStatut?: string,
  body?: any
): Promise<{ allowed: boolean; error?: string }> {

  console.log(`[PERMISSION] User: ${userId} | Role: ${userRole} | Action: ${action} | NewStatut: ${newStatut}`);

  // ====================== ADMIN & AUDITEUR ======================
  if (userRole === 'ADMIN' || userRole === 'AUDITEUR') {
    if (newStatut && ['EN_COURS', 'TERMINE', 'VERIFIE'].includes(newStatut)) {
      return { 
        allowed: false, 
        error: "Les administrateurs et auditeurs ne peuvent pas changer directement le statut." 
      };
    }
    return { allowed: true };
  }

  // ====================== TECHNICIEN ======================
  if (userRole === 'TECHNICIEN') {
    const plan = await prisma.planCorrection.findUnique({
      where: { id: planId },
      select: { assigneA: true }
    });

    if (!plan || plan.assigneA !== userId) {
      return { allowed: false, error: "Ce plan ne vous est pas assigné." };
    }

    if (newStatut && ['EN_COURS', 'TERMINE'].includes(newStatut)) {
      return { allowed: true };
    }

    return { 
      allowed: false, 
      error: "Le technicien ne peut que démarrer ou terminer son plan." 
    };
  }

  // ====================== SUPERVISEUR ======================
  if (userRole === 'SUPERVISEUR') {
    if (newStatut === 'VERIFIE') {
      const plan = await prisma.planCorrection.findUnique({
        where: { id: planId },
        select: { statut: true }
      });
      if (plan?.statut !== 'TERMINE') {
        return { allowed: false, error: "Le superviseur ne peut vérifier que les plans terminés." };
      }
      return { allowed: true };
    }
    return { allowed: false, error: "Action non autorisée pour un superviseur." };
  }

  return { allowed: false, error: 'Rôle non reconnu' };
}

// ============================================================
// GET
// ============================================================
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { id } = await params;

    const plan = await prisma.planCorrection.findUnique({
      where: { id },
      include: PLAN_INCLUDE,
    });

    if (!plan) return NextResponse.json({ error: 'Plan non trouvé' }, { status: 404 });

    return NextResponse.json({ success: true, data: plan });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// ============================================================
// PATCH
// ============================================================
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    const permission = await checkPermission(
      session.user.id,
      session.user.role || '',
      id,
      'UPDATE',
      body.statut,
      body
    );

    if (!permission.allowed) {
      return NextResponse.json({ error: permission.error }, { status: 403 });
    }

    const updated = await prisma.planCorrection.update({
      where: { id },
      data: {
        statut: body.statut,
        // Le technicien ne peut pas modifier ces champs
        ...(session.user.role !== 'TECHNICIEN' && {
          priorite: body.priorite,
          dateEcheance: body.dateEcheance ? new Date(body.dateEcheance) : undefined,
          commentaire: body.commentaire,
          assigneA: body.assigneA !== undefined ? body.assigneA : undefined,
        }),
      },
      include: PLAN_INCLUDE,
    });

    if (body.statut === 'VERIFIE') {
      await prisma.vulnerabilite.update({
        where: { id: updated.idVulnerabilite },
        data: {
          statut: StatutVulnerabilite.VERIFIEE,
          dateCorrection: new Date(),
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Plan mis à jour avec succès',
      data: updated,
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
  }
}

// ============================================================
// DELETE (Seulement Admin & Auditeur)
// ============================================================
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    if (!['ADMIN', 'AUDITEUR'].includes(session.user.role || '')) {
      return NextResponse.json({ 
        error: 'Seul l\'administrateur ou l\'auditeur peut supprimer un plan.' 
      }, { status: 403 });
    }

    const { id } = await params;

    const plan = await prisma.planCorrection.findUnique({
      where: { id },
      select: { idVulnerabilite: true }
    });

    if (!plan) return NextResponse.json({ error: 'Plan non trouvé' }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      await tx.planCorrection.delete({ where: { id } });
      await tx.vulnerabilite.update({
        where: { id: plan.idVulnerabilite },
        data: { 
          statut: StatutVulnerabilite.OUVERTE, 
          assigneA: null 
        }
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Plan supprimé avec succès.'
    });
  } catch (error: any) {
    console.error('Erreur DELETE:', error);
    return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 });
  }
}