import { prisma } from '@/lib/prisma';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { StatutScan } from '@prisma/client';

import { importResultsToPrisma } from './importResultsService';
import { createCorrectionPlans } from './planCorrectionService';
import { sendAlerts } from './alertService';

const execAsync = promisify(exec);

interface ScanResult {
  status: string;
  scanner?: string;
  target?: string;
  data?: any[];
  error?: string;
  [key: string]: any;
}

/**
 * Fonction principale de lancement du scan (arrière-plan)
 * Respecte le diagramme de séquence Flux 1
 */
export async function triggerScanBackground(scanId: string): Promise<void> {
  console.log(`[SCAN START] Début du scan ${scanId}`);

  try {
    // 1. Récupérer les infos du scan
    const scan = await prisma.scan.findUnique({
      where: { id: scanId },
      include: { actif: true }
    });

    if (!scan || !scan.actif) {
      throw new Error(`Scan ou actif introuvable pour l'ID ${scanId}`);
    }

    const target = scan.cible || scan.actif.adresseIP || scan.actif.hostname;
    if (!target) throw new Error("Aucune cible définie pour cet actif");

    // 2. Mise à jour → EN_COURS (comme dans le diagramme)
    await prisma.scan.update({
      where: { id: scanId },
      data: { 
        statut: StatutScan.EN_COURS, 
        debut: new Date() 
      },
    });

    const scriptPath = path.join(process.cwd(), 'python-scanner', 'scan.py');
    const command = `python3 ${scriptPath} ${scan.outil.toLowerCase()} ${target} ${scanId}`;

    console.log(`[SCAN] Exécution : ${command}`);

    const { stdout, stderr } = await execAsync(command, { timeout: 600000 }); // 10 minutes max

    if (stderr) console.warn("[Python stderr]:", stderr);

    let result: ScanResult;
    try {
      result = JSON.parse(stdout);
    } catch {
      result = { status: "error", error: "Sortie Python invalide" };
    }

    // 3. Import des résultats + Post-traitement complet (Diagramme)
    if (result.status === "success") {
      await importResultsToPrisma(scanId, result);
      await createCorrectionPlans(scanId);
      await sendAlerts(scanId);

      // Mise à jour finale
      await prisma.scan.update({
        where: { id: scanId },
        data: {
          statut: StatutScan.TERMINE,
          fin: new Date(),
          resultatBrut: result as any,
        },
      });

      console.log(`✅ [SCAN SUCCESS] Scan ${scanId} terminé avec succès`);
    } else {
      throw new Error(result.error || "Scan échoué");
    }

  } catch (error: any) {
    console.error(`❌ [SCAN ERROR] Scan ${scanId}:`, error.message);

    await prisma.scan.update({
      where: { id: scanId },
      data: {
        statut: StatutScan.ECHEC,
        fin: new Date(),
        erreur: error.message,
      },
    });
  }
}