import { prisma } from '@/lib/prisma';
import { Priorite, StatutPlan, Severite } from '@prisma/client';

export async function createCorrectionPlans(scanId: string, assigneeId?: string) {
  try {
    // Récupérer toutes les vulnérabilités du scan qui n'ont pas encore de plan
    const vulnerabilites = await prisma.vulnerabilite.findMany({
      where: {
        idScan: scanId,
        statut: 'OUVERTE',
        plan: null,                    // Pas encore de plan créé
      },
      include: {
        scan: {
          select: { cible: true, utilisateur: true }
        }
      }
    });

    if (vulnerabilites.length === 0) {
      console.log(`Aucune vulnérabilité ouverte pour le scan ${scanId}`);
      return { created: 0 };
    }

    const plansCreated = [];

    for (const vuln of vulnerabilites) {
      // Déterminer la priorité selon la sévérité (logique métier)
      let priorite: Priorite = Priorite.MOYENNE;
      if (vuln.severite === Severite.CRITICAL) priorite = Priorite.CRITIQUE;
      else if (vuln.severite === Severite.HIGH) priorite = Priorite.HAUTE;
      else if (vuln.severite === Severite.MEDIUM) priorite = Priorite.MOYENNE;
      else priorite = Priorite.BASSE;

      // Date d'échéance : 7 jours pour critique/haute, 30 jours sinon
      const days = (vuln.severite === Severite.CRITICAL || vuln.severite === Severite.HIGH) ? 7 : 30;
      const dateEcheance = new Date();
      dateEcheance.setDate(dateEcheance.getDate() + days);

      // Créer le plan de correction
      const plan = await prisma.planCorrection.create({
        data: {
          idVulnerabilite: vuln.id,
          assigneA: assigneeId || vuln.scan?.utilisateur?.id || vuln.assigneA || "", 
          priorite,
          dateEcheance,
          statut: StatutPlan.A_FAIRE,
          commentaire: `Plan généré automatiquement après le scan ${scanId}`,
        },
        include: {
          vulnerabilite: true,
          assigne: {
            select: { nom: true, prenom: true, email: true }
          }
        }
      });

      plansCreated.push(plan);
    }

    console.log(`✅ ${plansCreated.length} plans de correction créés pour le scan ${scanId}`);

    return {
      success: true,
      created: plansCreated.length,
      plans: plansCreated
    };

  } catch (error: any) {
    console.error("Erreur lors de la création des plans de correction:", error);
    throw new Error(`Échec de création des plans : ${error.message}`);
  }
}