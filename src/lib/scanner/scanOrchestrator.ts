import { prisma } from '@/lib/prisma';
import { StatutScan, Severite, StatutVulnerabilite, Priorite, StatutPlan } from '@prisma/client';
import { startOpenvasScan } from './openvas';
import { processScanResults } from './postScanProcessor';
import { sendAlert } from '@/lib/alertService';

// ============================================================
// DÉLAIS PAR SÉVÉRITÉ
// ============================================================

const DELAIS_JOURS: Record<Severite, number> = {
  CRITICAL : 2,
  HIGH     : 7,
  MEDIUM   : 30,
  LOW      : 90,
};

const PRIORITE_MAP: Record<Severite, Priorite> = {
  CRITICAL : Priorite.CRITIQUE,
  HIGH     : Priorite.HAUTE,
  MEDIUM   : Priorite.MOYENNE,
  LOW      : Priorite.BASSE,
};

function calculerDateEcheance(severite: Severite, dateDepart?: Date): Date {
  const base  = dateDepart ?? new Date();
  const jours = DELAIS_JOURS[severite];
  const date  = new Date(base);
  date.setDate(date.getDate() + jours);
  return date;
}

// ============================================================
// ⭐ PLANS AUTO — CRITICAL + HIGH uniquement
// ============================================================

async function creerPlansAutomatiques(
  scanId    : string,
  createdBy : string,
): Promise<void> {

  const vulnsUrgentes = await prisma.vulnerabilite.findMany({
    where: {
      idScan   : scanId,
      statut   : StatutVulnerabilite.OUVERTE,
      deletedAt: null,
      severite : { in: [Severite.CRITICAL, Severite.HIGH] },
      plan     : { none: {} },
    }
  });

  if (vulnsUrgentes.length === 0) {
    console.log('[PLAN] Aucune faille CRITICAL/HIGH à planifier');
    return;
  }

  console.log(`[PLAN] 🎯 ${vulnsUrgentes.length} failles urgentes → création des plans`);

  for (const vuln of vulnsUrgentes) {
    try {
      const dateEcheance = calculerDateEcheance(
        vuln.severite as Severite,
        vuln.dateDecouverte
      );

      await prisma.$transaction(async (tx) => {
        await tx.planCorrection.create({
          data: {
            idVulnerabilite : vuln.id,
            priorite        : PRIORITE_MAP[vuln.severite as Severite],
            dateEcheance,
            statut          : StatutPlan.A_FAIRE,
            commentaire     : `⚡ Auto-généré — ${vuln.severite}. Délai : ${DELAIS_JOURS[vuln.severite as Severite]} jours.`,
            createdBy,
          }
        });

        await tx.vulnerabilite.update({
          where: { id: vuln.id },
          data : { statut: StatutVulnerabilite.EN_COURS },
        });
      });

      console.log(
        `[PLAN] ✅ "${vuln.titre}" | ${vuln.severite} | ` +
        `Échéance: ${dateEcheance.toLocaleDateString('fr-FR')}`
      );

    } catch (err: any) {
      console.error(`[PLAN] ❌ "${vuln.titre}":`, err.message);
    }
  }

  // Log MEDIUM/LOW
  const nbMoyennes = await prisma.vulnerabilite.count({
    where: {
      idScan  : scanId,
      severite: { in: [Severite.MEDIUM, Severite.LOW] },
      statut  : StatutVulnerabilite.OUVERTE,
    }
  });

  if (nbMoyennes > 0) {
    console.log(`[PLAN] ℹ️  ${nbMoyennes} failles MEDIUM/LOW → triage manuel requis`);
  }
}

// ============================================================
// ORCHESTRATEUR PRINCIPAL
// ============================================================

export async function orchestrateScan(scanId: string) {
  console.log(`🚀 [ORCHESTRATOR] Début orchestration scan ${scanId}`);

  try {
    // 1. Mise en cours
    await prisma.scan.update({
      where: { id: scanId },
      data : { statut: StatutScan.EN_COURS, debut: new Date() }
    });

    const scan = await prisma.scan.findUnique({
      where  : { id: scanId },
      include: { actif: true }
    });

    if (!scan) throw new Error("Scan non trouvé");

    console.log(`📡 [ORCHESTRATOR] Lancement scan sur ${scan.cible || scan.actif.adresseIP}`);

    // 2. Lancement du scan
    await startOpenvasScan(
      scan.cible || scan.actif.adresseIP || "",
      scan.id
    );

    // 3. Post-traitement
    await processScanResults(scanId);

    // ⭐ 4. Création automatique des plans CRITICAL + HIGH
    await creerPlansAutomatiques(scanId, scan.lancerPar);

    // 5. Finalisation
    const finScan = new Date();

    await prisma.scan.update({
      where: { id: scanId },
      data : {
        statut: StatutScan.TERMINE,
        fin   : finScan,
        duree : Math.floor((finScan.getTime() - scan.debut!.getTime()) / 1000)
      }
    });

    // Mise à jour actif
    try {
      const updated = await prisma.actif.update({
        where : { id: scan.idActif },
        data  : { dernierScan: finScan },
        select: { nom: true, dernierScan: true }
      });
      console.log(`✅ [SUCCESS] dernierScan mis à jour pour ${updated.nom}`);
    } catch (err: any) {
      console.error(`❌ [ERROR] Échec mise à jour dernierScan:`, err.message);
    }

    // 6. Alertes
    const criticalCount = await prisma.vulnerabilite.count({
      where: { idScan: scanId, severite: { in: ['CRITICAL', 'HIGH'] } }
    });

    await sendAlert({
      scanId,
      type    : 'SCAN_COMPLETED',
      message : `Scan terminé sur ${scan.actif.nom} - ${criticalCount} vulnérabilités critiques`,
      severity: criticalCount > 0 ? 'CRITICAL' : 'INFO',
      userId  : scan.lancerPar
    });

    console.log(`✅ [ORCHESTRATOR] Orchestration terminée pour ${scanId}`);
    return { success: true, scanId };

  } catch (error: any) {
    console.error(`❌ [ORCHESTRATOR] Erreur:`, error.message);

    await prisma.scan.update({
      where: { id: scanId },
      data : { statut: StatutScan.ECHEC, erreur: error.message, fin: new Date() }
    });

    return { success: false, error: error.message };
  }
}