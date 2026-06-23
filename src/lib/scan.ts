'use server';
import { prisma } from '@/lib/prisma';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { StatutScan, Severite, StatutVulnerabilite } from '@prisma/client';
import { broadcastScanCompleted } from './sse';

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

    if (pythonResult.status === "success" && pythonResult.data) {
      await saveVulnerabilitiesFromPython(scanId, pythonResult.data);
    }

    // Post-traitement SANS création automatique de plans
    await postScanProcessing(scanId);

    return { success: true, scanId };

  } catch (error: any) {
    console.error(`❌ Erreur lors du scan ${scanId}:`, error);
    await prisma.scan.update({
      where: { id: scanId },
      data: { statut: StatutScan.ECHEC, fin: new Date(), erreur: error.message }
    });
    throw error;
  }
}

// ==================== SAUVEGARDE VULNÉRABILITÉS ====================
async function saveVulnerabilitiesFromPython(scanId: string, data: PythonVulnerability[]) {
  console.log(`📥 Enregistrement de ${data.length} vulnérabilités pour le scan ${scanId}`);

  for (const item of data) {
    try {
      await prisma.vulnerabilite.create({
        data: {
          idScan: scanId,
          cveId: item.cveId || item.cve || null,
          titre: item.titre || item.name || 'Vulnérabilité détectée',
          description: item.description || '',
          severite: mapSeverity(item.severite || item.severity),
          scoreCVSS: item.scoreCVSS || item.cvss || null,
          vecteurCVSS: item.vecteurCVSS || item.vector || null,
          statut: StatutVulnerabilite.OUVERTE,
          preuve: item.preuve || JSON.stringify(item),
          recommandation: item.recommandation || item.solution || "Correctif recommandé",
          risqueRelatif: (item.scoreCVSS || item.cvss || 0) * 0.8,
          dateDecouverte: new Date(),
          impact: item.impact || item.threat,
        }
      });
    } catch (err) {
      console.error(`❌ Erreur création vulnérabilité:`, err);
    }
  }
}

function mapSeverity(sev: string | undefined): Severite {
  if (!sev) return Severite.LOW;
  const s = sev.toLowerCase();
  if (s.includes('critical')) return Severite.CRITICAL;
  if (s.includes('high')) return Severite.HIGH;
  if (s.includes('medium')) return Severite.MEDIUM;
  return Severite.LOW;
}

// ==================== POST-PROCESSING (SANS PLANS AUTO) ====================
async function postScanProcessing(scanId: string) {
  try {
    console.log(`📥 Début du post-traitement pour le scan ${scanId}...`);

    // Mise à jour du statut du scan
    await prisma.scan.update({
      where: { id: scanId },
      data: { statut: StatutScan.TERMINE, fin: new Date() }
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