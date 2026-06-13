import { prisma } from '@/lib/prisma';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { StatutScan } from '@prisma/client';

const execAsync = promisify(exec);

interface ScanResult {
  status: string;
  scanner?: string;
  target?: string;
  data?: any[];
  error?: string;
}

/**
 * Fonction principale appelée par le diagramme de séquence
 * Lance le scan en arrière-plan et met à jour le statut + résultats
 */
export async function triggerScanBackground(scanId: string): Promise<void> {
  console.log(`[SCAN START] Début du scan ${scanId}`);

  try {
    // 1. Récupérer les infos du scan et de l'actif
    const scan = await prisma.scan.findUnique({
      where: { id: scanId },
      include: { actif: true }
    });

    if (!scan || !scan.actif) {
      throw new Error(`Scan ou actif introuvable pour l'ID ${scanId}`);
    }

    const target = scan.actif.adresseIP || scan.actif.hostname;
    if (!target) throw new Error("Aucune cible (IP/Hostname) trouvée pour cet actif");

    // 2. Mise à jour statut → EN_COURS
    await prisma.scan.update({
      where: { id: scanId },
      data: { statut: StatutScan.EN_COURS, debut: new Date() },
    });

    const scriptPath = path.join(process.cwd(), 'python-scanner', 'scan.py');

    // 3. Lancer le scanner Python
    const command = `python3 ${scriptPath} ${scan.outil.toLowerCase()} ${target}`;
    console.log(`[SCAN] Exécution : ${command}`);

    const { stdout, stderr } = await execAsync(command);

    if (stderr) console.warn("[Python stderr]:", stderr);

    let result: ScanResult;
    try {
      result = JSON.parse(stdout);
    } catch {
      result = { status: "error", error: "Sortie Python invalide" };
    }

    // 4. Mise à jour finale du scan
    const statutFinal = result.status === "success" ? StatutScan.TERMINE : StatutScan.ECHEC;

    await prisma.scan.update({
      where: { id: scanId },
      data: {
        statut: statutFinal,
        fin: new Date(),
        resultatBrut: stdout,
        metadata: result as any,
      },
    });

    console.log(`[SCAN SUCCESS] Scan ${scanId} terminé avec statut ${statutFinal}`);

  } catch (error: any) {
    console.error(`[SCAN ERROR] Scan ${scanId}:`, error.message);

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