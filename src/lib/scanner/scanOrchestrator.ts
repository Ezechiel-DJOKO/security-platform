// src/lib/scanner/scanOrchestrator.ts
import { prisma } from '@/lib/prisma';
import { StatutScan } from '@prisma/client';
import { startOpenvasScan } from './openvas';
import { processScanResults } from './postScanProcessor';
import { sendAlert } from '@/lib/alertService';

export async function orchestrateScan(scanId: string) {
  console.log(`🚀 Orchestration du scan ${scanId} selon diagramme Flux 1`);

  try {
    // 1. Passage en EN_COURS
    await prisma.scan.update({
      where: { id: scanId },
      data: { 
        statut: StatutScan.EN_COURS, 
        debut: new Date() 
      }
    });

    const scan = await prisma.scan.findUnique({
      where: { id: scanId },
      include: { 
        actif: true,
        utilisateur: true 
      }
    });

    if (!scan) throw new Error("Scan non trouvé");

    // 2. Lancement du scan OpenVAS
    console.log(`📡 Démarrage scan OpenVAS sur ${scan.cible}`);
    const openvasResult = await startOpenvasScan(scan.cible || scan.actif.adresseIP || "", scan.id);

    // 3. Mise à jour des résultats bruts (correction du spread error)
    await prisma.scan.update({
      where: { id: scanId },
      data: {
        resultatBrut: openvasResult.raw || openvasResult as any,
        metadata: scan.metadata 
          ? { ...(scan.metadata as object), openvasJobId: openvasResult.jobId }
          : { openvasJobId: openvasResult.jobId }
      }
    });

    // 4. Post-traitement (analyse CVE, CVSS, création des vulnérabilités)
    await processScanResults(scanId);

    // 5. Création automatique des plans de correction pour les vulnérabilités critiques
    const criticalVulns = await prisma.vulnerabilite.findMany({
      where: { 
        idScan: scanId,
        severite: { in: ['CRITICAL', 'HIGH'] }
      }
    });

    for (const vuln of criticalVulns) {
      await createRemediationPlan(vuln.id, scan.lancerPar); // Fonction locale ci-dessous
    }

    // 6. Finalisation du scan
    await prisma.scan.update({
      where: { id: scanId },
      data: {
        statut: StatutScan.TERMINE,
        fin: new Date(),
        duree: Math.floor((Date.now() - scan.debut!.getTime()) / 1000)
      }
    });

    // 7. Envoi des alertes
    await sendAlert({
      scanId,
      type: 'SCAN_COMPLETED',
      message: `Scan terminé sur ${scan.actif.nom} - ${criticalVulns.length} vulnérabilités critiques détectées`,
      severity: criticalVulns.length > 0 ? 'CRITICAL' : 'INFO',
      userId: scan.lancerPar
    });

    console.log(`✅ Orchestration terminée avec succès pour le scan ${scanId}`);
    return { success: true, scanId };

  } catch (error: any) {
    console.error("❌ Erreur orchestration:", error);

    await prisma.scan.update({
      where: { id: scanId },
      data: { 
        statut: StatutScan.ECHEC, 
        erreur: error.message, 
        fin: new Date() 
      }
    });

    await sendAlert({
      scanId,
      type: 'ERROR',
      message: `Échec du scan ${scanId}: ${error.message}`,
      severity: 'CRITICAL'
    });

    return { success: false, error: error.message };
  }
}

/** Fonction locale pour créer un plan de correction (remplace createRemediationPlan) */
async function createRemediationPlan(vulnerabiliteId: string, assignePar: string) {
  return prisma.planCorrection.create({
    data: {
      idVulnerabilite: vulnerabiliteId,
      assigneA: assignePar,
      priorite: 'HAUTE',
      dateEcheance: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 jours
      statut: 'A_FAIRE',
      commentaire: "Généré automatiquement après détection par OpenVAS"
    }
  });
}