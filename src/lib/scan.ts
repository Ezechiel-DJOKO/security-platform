// src/lib/scan.ts
import { prisma } from '@/lib/prisma';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { StatutScan, OutilScan } from '@prisma/client';
import { importResultsToPrisma } from './importResultsService';
import { createCorrectionPlans } from './planCorrectionService';
import { sendAlerts } from './alertService';

const execAsync = promisify(exec);

interface ScanResult {
  status: string;
  scanner?: string;
  target?: string;
  data?: any[];
  findings?: number;
  error?: string;
  [key: string]: any;
}

/**
 * Fonction principale de lancement du scan en arrière-plan
 * Respecte strictement le diagramme de séquence Flux 1
 */
export async function triggerScanBackground(scanId: string): Promise<void> {
  console.log(`[SCAN START] Début du scan ${scanId}`);

  try {
    // 1. Récupérer les infos du scan
    const scan = await prisma.scan.findUnique({
      where: { id: scanId },
      include: { actif: true, utilisateur: true }
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
      }
    });

    console.log(`🎯 Cible : ${target} | Outil : ${scan.outil}`);

    const scriptPath = path.join(process.cwd(), 'python-scanner', 'scan.py');
    const command = `python3 ${scriptPath} --tool ${scan.outil.toLowerCase()} --target ${target} --scan-id ${scanId}`;

    console.log(`[SCAN] Exécution : ${command}`);

    // Exécution avec timeout raisonnable
    const { stdout, stderr } = await execAsync(command, { 
      timeout: 900000, // 15 minutes max
      maxBuffer: 10 * 1024 * 1024 // 10MB
    });

    if (stderr) console.warn("[Python stderr]:", stderr);

    let result: ScanResult;
    try {
      result = JSON.parse(stdout.trim());
    } catch (e) {
      console.error("Impossible de parser la sortie JSON du scanner");
      result = { status: "error", error: "Sortie Python invalide (non-JSON)" };
    }

    // 3. Post-traitement complet selon le diagramme
    if (result.status === "success" || result.status === "completed") {
      // Import des vulnérabilités dans Prisma
      await importResultsToPrisma(scanId, result);

      // Création automatique des plans de correction
      await createCorrectionPlans(scanId);

      // Envoi des alertes (surtout pour les critiques)
      await sendAlerts(scanId);

      // Mise à jour finale
      await prisma.scan.update({
        where: { id: scanId },
        data: {
          statut: StatutScan.TERMINE,
          fin: new Date(),
          resultatBrut: result as any,
        }
      });

      console.log(`✅ [SCAN SUCCESS] Scan ${scanId} terminé avec succès`);
    } else {
      throw new Error(result.error || "Le scan a échoué sans message d'erreur");
    }

  } catch (error: any) {
    console.error(`❌ [SCAN ERROR] Scan ${scanId}:`, error.message);

    await prisma.scan.update({
      where: { id: scanId },
      data: {
        statut: StatutScan.ECHEC,
        fin: new Date(),
        erreur: error.message?.substring(0, 500)
      }
    });
  }
}