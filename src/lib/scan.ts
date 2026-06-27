'use server';
import { prisma } from '@/lib/prisma';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { StatutScan, Severite } from '@prisma/client';
import { broadcastScanCompleted } from './sse';
import { importResultsToPrisma } from './importResultsService';

const execAsync = promisify(exec);

// ==================== TYPES ====================
interface PythonScanResult {
  status: string;
  data: PythonVulnerability[];
}

interface PythonVulnerability {
  cveId?: string;
  cve?: string;
  titre?: string;
  name?: string;
  description?: string;
  severite?: string;
  severity?: string;
  scoreCVSS?: number;
  cvss?: number;
  vecteurCVSS?: string;
  vector?: string;
  preuve?: string;
  recommandation?: string;
  solution?: string;
  impact?: string;
  threat?: string;
}

// ==================== TRIGGER SCAN ====================
export async function triggerScanBackground(scanId: string) {
  console.log(`[SCAN START] Début du scan ${scanId}`);

  try {
    const scan = await prisma.scan.findUnique({
      where: { id: scanId },
      include: { actif: true }
    });

    if (!scan) throw new Error(`Scan ${scanId} introuvable`);

    const cible = scan.cible!;
    const outil = scan.outil;
    const scriptPath = path.join(process.cwd(), 'python-scanner', 'scan.py');

    console.log(`🎯 Cible : ${cible} | Outil : ${outil}`);

    const command = `python3 ${scriptPath} --tool ${outil.toLowerCase()} --target ${cible} --scan-id ${scanId}`;
    console.log(`[SCAN] Exécution : ${command}`);

    const { stdout, stderr } = await execAsync(command, { timeout: 300000 });

    if (stderr) console.warn(`[Python stderr]: ${stderr}`);
    if (stdout) console.log(`[Python stdout]: ${stdout}`);

    // Parsing du résultat Python
    const pythonResult: PythonScanResult = JSON.parse(stdout.trim());

    if (pythonResult.status === "success" && pythonResult.data?.length > 0) {
      await saveVulnerabilitiesFromPython(scanId, pythonResult.data);
    }

    // Post-traitement
    await postScanProcessing(scanId);

    return { success: true, scanId };

  } catch (error: any) {
    console.error(`❌ Erreur lors du scan ${scanId}:`, error);

    await prisma.scan.update({
      where: { id: scanId },
      data: { 
        statut: StatutScan.ECHEC, 
        fin: new Date(), 
        erreur: error.message 
      }
    });

    throw error;
  }
}

// ==================== SAUVEGARDE VULNÉRABILITÉS ====================
async function saveVulnerabilitiesFromPython(scanId: string, data: PythonVulnerability[]) {
  console.log(`📥 Enregistrement de ${data.length} vulnérabilités pour le scan ${scanId}`);

  try {
    const adaptedResult = {
      scanner: "python-scanner",
      target: "",
      data: data.map(item => ({
        cve_id: item.cveId || item.cve,
        titre: item.titre || item.name,
        description: item.description,
        severity: item.severite || item.severity,
        scoreCVSS: item.scoreCVSS || item.cvss,
        recommandation: item.recommandation || item.solution,
        impact: item.impact || item.threat,
        preuve: item.preuve,
      }))
    };

    const result = await importResultsToPrisma(scanId, adaptedResult, 'MANUAL');
    
    console.log(`✅ Import réussi via service centralisé : ${result.imported} vulnérabilités`);
    return result;

  } catch (error: any) {
    console.error(`❌ Erreur lors de l'import des vulnérabilités:`, error);
    throw error;
  }
}

// ==================== POST-PROCESSING ====================
async function postScanProcessing(scanId: string) {
  try {
    console.log(`📥 Début du post-traitement pour le scan ${scanId}...`);

    const scan = await prisma.scan.findUnique({
      where: { id: scanId },
      include: { actif: true }
    });

    if (!scan) {
      console.error("Scan non trouvé dans postScanProcessing");
      return;
    }

    const now = new Date();

    // Mise à jour du scan
    await prisma.scan.update({
      where: { id: scanId },
      data: {
        statut: StatutScan.TERMINE,
        fin: now
      }
    });

    // Mise à jour de l'actif
    await prisma.actif.update({
      where: { id: scan.idActif },
      data: { dernierScan: now }
    });

    console.log(`✅ [SCAN SUCCESS] Scan ${scanId} terminé avec succès`);
    await sendScanCompletionAlert(scanId);

  } catch (error) {
    console.error(`Erreur post-traitement:`, error);
  }
}

// ==================== ALERTE ====================
async function sendScanCompletionAlert(scanId: string) {
  try {
    const scan = await prisma.scan.findUnique({
      where: { id: scanId },
      include: { vulnerabilites: true }
    });

    if (!scan) return;

    const nbCritiques = scan.vulnerabilites.filter(v => v.severite === Severite.CRITICAL).length;

    await prisma.auditLog.create({
      data: {
        action: 'SCAN_COMPLETED',
        entite: 'SCAN',
        idEntite: scanId,
        details: {
          cible: scan.cible,
          outil: scan.outil,
          nbVulnerabilites: scan.vulnerabilites.length,
          nbCritiques
        }
      }
    });

    broadcastScanCompleted({
      scanId,
      cible: scan.cible || '',
      nbVulnerabilites: scan.vulnerabilites.length,
      nbCritiques,
      message: nbCritiques > 0 ? `🚨 ${nbCritiques} critique(s)` : `✅ Scan terminé`
    });

  } catch (e) {
    console.error("Erreur alerte:", e);
  }
}