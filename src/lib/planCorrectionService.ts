// src/lib/planCorrectionService.ts
import { prisma } from '@/lib/prisma';
import { Priorite, StatutPlan, Severite } from '@prisma/client';

// Define proper types
interface PlanDataInput {
  idVulnerabilite: string;
  priorite: Priorite;
  dateEcheance: Date;
  statut: StatutPlan;
  commentaire: string;
  assigneA: string; // Make it required with a default value
}

interface PlanCreationError extends Error {
  message: string;
}

// Default admin ID to use when no assignee is specified
const DEFAULT_ADMIN_ID = "00000000-0000-0000-0000-000000000000";

export async function createCorrectionPlans(scanId: string, assigneeId?: string) {
  try {
    const vulnerabilites = await prisma.vulnerabilite.findMany({
      where: {
        idScan: scanId,
        statut: 'OUVERTE',
        plan: null,
      },
      include: {
        plan: true,
      }
    });

    console.log(`🔍 [DEBUG] Vulnérabilités trouvées pour scan ${scanId} : ${vulnerabilites.length}`);
    console.log(`🔍 [DEBUG] assigneeId reçu :`, assigneeId);

    if (vulnerabilites.length === 0) {
      console.log(`ℹ️ Aucune vulnérabilité ouverte sans plan pour le scan ${scanId}`);
      return { created: 0 };
    }

    const plansCreated = [];

    for (const vuln of vulnerabilites) {
      let priorite: Priorite = Priorite.MOYENNE;
      if (vuln.severite === Severite.CRITICAL) priorite = Priorite.CRITIQUE;
      else if (vuln.severite === Severite.HIGH) priorite = Priorite.HAUTE;
      else if (vuln.severite === Severite.MEDIUM) priorite = Priorite.MOYENNE;

      const days = (vuln.severite === Severite.CRITICAL || vuln.severite === Severite.HIGH) ? 7 : 30;
      const dateEcheance = new Date();
      dateEcheance.setDate(dateEcheance.getDate() + days);

      // Use the provided assigneeId or fallback to default admin
      const finalAssignee = assigneeId || DEFAULT_ADMIN_ID;
      
      if (assigneeId) {
        console.log(`👤 Assignation forcée pour vuln ${vuln.id}`);
      } else {
        console.log(`➖ Pas d'assignation fournie, utilisation de l'admin par défaut pour vuln ${vuln.id}`);
      }

      const data: PlanDataInput = {
        idVulnerabilite: vuln.id,
        priorite,
        dateEcheance,
        statut: StatutPlan.A_FAIRE,
        commentaire: `Plan généré automatiquement après le scan ${scanId}`,
        assigneA: finalAssignee,
      };

      const plan = await prisma.planCorrection.create({ data });
      plansCreated.push(plan);
    }

    console.log(`✅ ${plansCreated.length} plans créés avec assignation ${assigneeId ? 'personnalisée' : 'par défaut'}`);
    return { success: true, created: plansCreated.length };

  } catch (error) {
    const err = error as PlanCreationError;
    console.error("❌ Erreur createCorrectionPlans:", err);
    throw error;
  }
}