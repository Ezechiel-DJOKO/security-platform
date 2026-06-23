// src/lib/scanner/scanOrchestrator.ts
import { prisma } from '@/lib/prisma';
import { StatutScan } from '@prisma/client';
import { startOpenvasScan } from './openvas';
import { processScanResults } from './postScanProcessor';
import { sendAlert } from '@/lib/alertService';

interface OpenVASResult {
  raw: unknown;
  jobId: string;
}

interface ScanMetadata {
  openvasJobId?: string;
  [key: string]: unknown;
}

interface OrchestrationError extends Error {
  message: string;
}

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
    const openvasResult = await startOpenvasScan(
      scan.cible || scan.actif.adresseIP || "", 
      scan.id
    );

    // 3. Mise à jour des résultats bruts
    const currentMetadata = scan.metadata as ScanMetadata || {};
    await prisma.scan.update({
      where: { id: scanId },
      data: {
        resultatBrut: openvasResult.raw || null,
        metadata: {
          ...currentMetadata,
          openvasJobId: openvasResult.jobId
        }
      }
    });

    // 4. Post-traitement (création / mise à jour des vulnérabilités)
    await processScanResults(scanId);

    // 5. Finalisation du scan
    await prisma.scan.update({
      where: { id: scanId },
      data: {
        statut: StatutScan.TERMINE,
        fin: new Date(),
        duree: Math.floor((Date.now() - scan.debut!.getTime()) / 1000)
      }
    });

    // 6. Envoi des alertes (sans créer de plans)
    const criticalVulnsCount = await prisma.vulnerabilite.count({
      where: {
        idScan: scanId,
        severite: { in: ['CRITICAL', 'HIGH'] }
      }
    });

    await sendAlert({
      scanId,
      type: 'SCAN_COMPLETED',
      message: `Scan terminé sur ${scan.actif.nom} - ${criticalVulnsCount} vulnérabilités critiques détectées`,
      severity: criticalVulnsCount > 0 ? 'CRITICAL' : 'INFO',
      userId: scan.lancerPar
    });

    console.log(`✅ Orchestration terminée avec succès pour le scan ${scanId}`);
    return { success: true, scanId };

  } catch (error) {
    const err = error as OrchestrationError;
    console.error("❌ Erreur orchestration:", err);

    await prisma.scan.update({
      where: { id: scanId },
      data: {
        statut: StatutScan.ECHEC,
        erreur: err.message,
        fin: new Date()
      }
    });

    await sendAlert({
      scanId,
      type: 'ERROR',
      message: `Échec du scan ${scanId}: ${err.message}`,
      severity: 'CRITICAL'
    });

    return { success: false, error: err.message };
  }
}