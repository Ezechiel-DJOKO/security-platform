'use server';

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { StatutPlan, Priorite } from '@prisma/client';
import { revalidatePath } from 'next/cache';

// ====================== ACTIONS POUR LE FLUX 2 ======================

// 1. Créer un plan de correction
export async function createPlanCorrection(
  vulnerabiliteId: string,
  priorite: Priorite = Priorite.MOYENNE,
  dateEcheance?: Date,
  commentaire?: string
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: "Vous devez être connecté" };
    }

    const plan = await prisma.planCorrection.create({
      data: {
        idVulnerabilite: vulnerabiliteId,
        assigneA: session.user.id,
        priorite,
        dateEcheance: dateEcheance || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        statut: StatutPlan.A_FAIRE,
        commentaire: commentaire || "Plan créé manuellement",
      },
      include: {
        vulnerabilite: true,
        assigne: true
      }
    });

    revalidatePath('/plans-correction');
    revalidatePath('/vulnerabilites');

    return { success: true, plan };
  } catch (error: any) {
    console.error("Erreur createPlanCorrection:", error);
    return { success: false, error: error.message };
  }
}

// 2. Assigner un plan à quelqu'un
export async function assignerPlan(planId: string, assigneeId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: false, error: "Non autorisé" };

    const plan = await prisma.planCorrection.update({
      where: { id: planId },
      data: { assigneA: assigneeId },
      include: { assigne: true, vulnerabilite: true }
    });

    revalidatePath('/plans-correction');
    return { success: true, plan };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 3. Mettre à jour le statut du plan
export async function updatePlanStatus(planId: string, statut: StatutPlan, commentaire?: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: false, error: "Non autorisé" };

    const data: any = { statut };

    // Si le plan est terminé ou vérifié → on met à jour la vulnérabilité
    if (statut === StatutPlan.TERMINE || statut === StatutPlan.VERIFIE) {
      data.dateResolution = new Date();

      await prisma.vulnerabilite.update({
        where: { id: (await prisma.planCorrection.findUnique({ where: { id: planId } }))?.idVulnerabilite },
        data: {
          statut: 'CORRIGEE',
          dateCorrection: new Date()
        }
      });
    }

    if (commentaire) data.commentaire = commentaire;

    const plan = await prisma.planCorrection.update({
      where: { id: planId },
      data,
      include: { vulnerabilite: true }
    });

    revalidatePath('/plans-correction');
    revalidatePath('/vulnerabilites');

    return { success: true, plan };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 4. Valider / Rejeter par le superviseur
// 4. Valider / Rejeter par le superviseur
export async function validerPlan(
  planId: string, 
  valide: boolean, 
  commentaireSuperviseur?: string
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: false, error: "Non autorisé" };

    const statut = valide ? StatutPlan.VERIFIE : StatutPlan.ANNULE;

    // Récupérer d'abord le plan actuel pour avoir l'ancien commentaire
    const planExistant = await prisma.planCorrection.findUnique({
      where: { id: planId },
      select: { commentaire: true }
    });

    const nouveauCommentaire = commentaireSuperviseur 
      ? `${planExistant?.commentaire || ''}\n\n[Superviseur]: ${commentaireSuperviseur}`
      : planExistant?.commentaire;

    const plan = await prisma.planCorrection.update({
      where: { id: planId },
      data: {
        statut,
        commentaire: nouveauCommentaire,
      },
      include: { 
        vulnerabilite: true,
        assigne: true 
      }
    });

    revalidatePath('/plans-correction');
    revalidatePath('/vulnerabilites');

    return { 
      success: true, 
      plan, 
      valide 
    };
  } catch (error: any) {
    console.error("Erreur validerPlan:", error);
    return { success: false, error: error.message };
  }
}

// 5. Supprimer un plan
export async function deletePlan(planId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: false, error: "Non autorisé" };

    await prisma.planCorrection.delete({ where: { id: planId } });

    revalidatePath('/plans-correction');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}