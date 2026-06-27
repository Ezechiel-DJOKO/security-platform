'use server';
import { prisma } from '@/lib/prisma';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { StatutScan, Severite, TypeVulnerabilite } from '@prisma/client';
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
  type?: string;
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
    if (!scan.cible) throw new Error(`Aucune cible définie pour le scan`);

    const { cible, outil, idActif } = scan;

    const scriptPath = path.join(process.cwd(), 'python-scanner', 'scan.py');
    console.log(`🎯 Cible : ${cible} | Outil : ${outil} | Actif : ${idActif}`);

    const command = `python3 ${scriptPath} --tool ${outil.toLowerCase()} --target ${cible} --scan-id ${scanId}`;
    console.log(`[SCAN] Exécution : ${command}`);

    const { stdout, stderr } = await execAsync(command, { timeout: 300000 });

    if (stderr) console.warn(`[Python stderr]: ${stderr}`);
    if (stdout) console.log(`[Python stdout]: ${stdout}`);

    const pythonResult: PythonScanResult = JSON.parse(stdout.trim());

    if (pythonResult.status === "success" && pythonResult.data?.length > 0) {
      await saveVulnerabilitiesFromPython(scanId, pythonResult.data, idActif);
    } else {
      console.warn(`⚠️ Aucun résultat de vulnérabilité retourné pour le scan ${scanId}`);
    }

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
async function saveVulnerabilitiesFromPython(
  scanId: string,
  data: PythonVulnerability[],
  idActif: string
) {
  console.log(`📥 Enregistrement de ${data.length} vulnérabilités pour l'actif ${idActif}`);

  try {
    const adaptedResult = {
      scanner: "python-scanner",
      target: "",
      data: data.map(item => ({
        idScan: scanId,
        idActif: idActif,                    // Liaison directe
        cveId: item.cveId || item.cve,
        titre: item.titre || item.name || 'Vulnérabilité détectée',
        description: item.description,
        severite: mapSeverity(item.severite || item.severity),
        scoreCVSS: item.scoreCVSS || item.cvss,
        vecteurCVSS: item.vecteurCVSS || item.vector,
        preuve: item.preuve,
        recommandation: item.recommandation || item.solution,
        impact: item.impact || item.threat,
        typeVulnerabilite: inferVulnerabilityType(item),
        statut: 'OUVERTE' as const,
        dateDecouverte: new Date(),
      }))
    };

    // Appel corrigé avec idActif
    const result = await importResultsToPrisma(
      scanId, 
      adaptedResult, 
      'MANUAL',
      idActif                          // ← Paramètre important
    );

    console.log(`✅ ${result.imported} vulnérabilités importées avec succès (liées à l'actif)`);
    return result;

  } catch (error: any) {
    console.error(`❌ Erreur lors de l'import des vulnérabilités:`, error);
    throw error;
  }
}

// ==================== FONCTIONS UTILITAIRES ====================
function mapSeverity(sev?: string): Severite {
  const severityMap: Record<string, Severite> = {
    critical: 'CRITICAL',
    high: 'HIGH',
    medium: 'MEDIUM',
    low: 'LOW',
  };
  return severityMap[sev?.toLowerCase() || ''] || 'MEDIUM';
}

function inferVulnerabilityType(item: PythonVulnerability): TypeVulnerabilite {
  const text = `${item.titre || ''} ${item.description || ''} ${item.type || ''}`.toLowerCase();

  if (text.includes('http') || text.includes('xss') || text.includes('sql') || text.includes('web')) {
    return TypeVulnerabilite.WEB_APP;
  }
  if (text.includes('network') || text.includes('port') || text.includes('firewall')) {
    return TypeVulnerabilite.NETWORK;
  }
  if (text.includes('container') || text.includes('docker') || text.includes('image')) {
    return TypeVulnerabilite.CONTAINER;
  }
  if (text.includes('depend') || text.includes('package')) {
    return TypeVulnerabilite.DEPENDENCY;
  }
  if (text.includes('cloud') || text.includes('aws') || text.includes('azure')) {
    return TypeVulnerabilite.CLOUD;
  }
  return TypeVulnerabilite.OTHER;
}

// ==================== POST-PROCESSING ====================
async function postScanProcessing(scanId: string) {
  try {
    const scan = await prisma.scan.findUnique({
      where: { id: scanId },
      include: { actif: true, vulnerabilites: true }
    });

    if (!scan) return;

    const now = new Date();

    await prisma.scan.update({
      where: { id: scanId },
      data: {
        statut: StatutScan.TERMINE,
        fin: now,
        duree: scan.debut ? Math.floor((now.getTime() - scan.debut.getTime()) / 1000) : undefined
      }
    });

    await prisma.actif.update({
      where: { id: scan.idActif },
      data: { dernierScan: now }
    });

    console.log(`✅ [SCAN SUCCESS] Scan ${scanId} terminé - ${scan.vulnerabilites.length} vulnérabilités`);

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