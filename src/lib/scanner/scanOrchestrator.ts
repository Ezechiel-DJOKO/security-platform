import { prisma } from '@/lib/prisma';
import { StatutScan } from '@prisma/client';
import { startOpenvasScan } from './openvas';
import { processScanResults } from './postScanProcessor';
import { sendAlert } from '@/lib/alertService';

export async function orchestrateScan(scanId: string) {
  console.log(`🚀 [ORCHESTRATOR] Début orchestration scan ${scanId}`);

  try {
    // 1. Mise en cours
    await prisma.scan.update({
      where: { id: scanId },
      data: { statut: StatutScan.EN_COURS, debut: new Date() }
    });

    const scan = await prisma.scan.findUnique({
      where: { id: scanId },
      include: { actif: true }
    });

    if (!scan) throw new Error("Scan non trouvé");

    console.log(`📡 [ORCHESTRATOR] Lancement scan sur ${scan.cible || scan.actif.adresseIP}`);

    // 2. Lancement du scan (OpenVAS ou autre)
    const openvasResult = await startOpenvasScan(
      scan.cible || scan.actif.adresseIP || "",
      scan.id
    );

    // 3. Post-traitement
    await processScanResults(scanId);

    // 4. FINALISATION + MISE À JOUR DERNIER SCAN
    const finScan = new Date();

    console.log(`🔄 [ORCHESTRATOR] Finalisation du scan ${scanId}`);

    await prisma.scan.update({
      where: { id: scanId },
      data: {
        statut: StatutScan.TERMINE,
        fin: finScan,
        duree: Math.floor((finScan.getTime() - scan.debut!.getTime()) / 1000)
      }
    });

    // Mise à jour critique de l'actif
    try {
      const updated = await prisma.actif.update({
        where: { id: scan.idActif },
        data: { dernierScan: finScan },
        select: { nom: true, dernierScan: true }
      });

      console.log(`✅ [SUCCESS] dernierScan mis à jour pour ${updated.nom}`);
      console.log(`   → ${updated.dernierScan?.toLocaleString('fr-FR')}`);
    } catch (err: any) {
      console.error(`❌ [ERROR] Échec mise à jour dernierScan:`, err.message);
    }

    // Alertes
    const criticalCount = await prisma.vulnerabilite.count({
      where: { idScan: scanId, severite: { in: ['CRITICAL', 'HIGH'] } }
    });

    await sendAlert({
      scanId,
      type: 'SCAN_COMPLETED',
      message: `Scan terminé sur ${scan.actif.nom} - ${criticalCount} vulnérabilités critiques`,
      severity: criticalCount > 0 ? 'CRITICAL' : 'INFO',
      userId: scan.lancerPar
    });

    console.log(`✅ [ORCHESTRATOR] Orchestration terminée avec succès pour ${scanId}`);
    return { success: true, scanId };

  } catch (error: any) {
    console.error(`❌ [ORCHESTRATOR] Erreur:`, error.message);
    await prisma.scan.update({
      where: { id: scanId },
      data: { statut: StatutScan.ECHEC, erreur: error.message, fin: new Date() }
    });
    return { success: false, error: error.message };
  }
}