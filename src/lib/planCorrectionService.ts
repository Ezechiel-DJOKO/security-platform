// src/lib/planCorrectionService.ts
import { prisma } from '@/lib/prisma';
import { Priorite, StatutPlan, Severite } from '@prisma/client';

export async function createCorrectionPlans(scanId: string, assigneeId?: string) {
  try {
    const vulnerabilites = await prisma.vulnerabilite.findMany({
      where: {
        idScan: scanId,
        statut: 'OUVERTE',
        plan: null,                    // Relation inverse
      },
      include: {
        scan: true
      }
    });

    if (vulnerabilites.length === 0) {
      console.log(`ℹ️ Aucune vulnérabilité ouverte pour le scan ${scanId}`);
      return { created: 0 };
    }

    console.log(`🛠️ Création de ${vulnerabilites.length} plans de correction...`);

    const plansCreated = [];

    for (const vuln of vulnerabilites) {
      // Détermination de la priorité
      let priorite: Priorite = Priorite.MOYENNE;
      if (vuln.severite === Severite.CRITICAL) priorite = Priorite.CRITIQUE;
      else if (vuln.severite === Severite.HIGH) priorite = Priorite.HAUTE;
      else if (vuln.severite === Severite.MEDIUM) priorite = Priorite.MOYENNE;

      // Calcul de la date d'échéance
      const days = (vuln.severite === Severite.CRITICAL || vuln.severite === Severite.HIGH) ? 7 : 30;
      const dateEcheance = new Date();
      dateEcheance.setDate(dateEcheance.getDate() + days);

      // Assignee (fallback sécurisé)
      const finalAssigneeId = assigneeId || vuln.scan?.lancerPar || vuln.assigneA || "system";

      const plan = await prisma.planCorrection.create({
        data: {
          idVulnerabilite: vuln.id,
          assigneA: finalAssigneeId,
          priorite,
          dateEcheance,
          statut: StatutPlan.A_FAIRE,
          commentaire: `Plan généré automatiquement après le scan ${scanId}`,
        }
      });

      plansCreated.push(plan);
    }

    console.log(`✅ ${plansCreated.length} plans de correction créés avec succès`);
    
    return { 
      success: true, 
      created: plansCreated.length 
    };

  } catch (error: any) {
    console.error("❌ Erreur createCorrectionPlans:", error);
    throw error;
  }
}