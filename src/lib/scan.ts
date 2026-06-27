'use server';
import { prisma } from '@/lib/prisma';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { 
  StatutScan, Severite, StatutVulnerabilite, 
  TypeVulnerabilite, Priorite, StatutPlan 
} from '@prisma/client';
import { broadcastScanCompleted } from './sse';

const execAsync = promisify(exec);

// ============================================================
// DÉLAIS PAR SÉVÉRITÉ (ISO 27001)
// ============================================================

const DELAIS_JOURS: Record<Severite, number> = {
  CRITICAL : 2,   // 48h
  HIGH     : 7,   // 7 jours
  MEDIUM   : 30,  // 30 jours
  LOW      : 90,  // 90 jours
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
// TYPES
// ============================================================

interface PythonScanResult {
  status : string;
  data   : PythonVulnerability[];
}

interface PythonVulnerability {
  cveId?         : string;
  cve?           : string;
  titre?         : string;
  name?          : string;
  description?   : string;
  severite?      : string;
  severity?      : string;
  scoreCVSS?     : number;
  cvss?          : number;
  vecteurCVSS?   : string;
  vector?        : string;
  url?           : string;
  preuve?        : string;
  recommandation?: string;
  solution?      : string;
  impact?        : string;
  threat?        : string;
  type?          : string;
}

// ============================================================
// MAPPING SÉVÉRITÉ
// ============================================================

function mapSeverity(raw?: string): Severite {
  const s = String(raw ?? '').toUpperCase().trim();
  console.log(`[SEVERITY] raw="${raw}" | normalized="${s}"`);

  switch (s) {
    case 'CRITICAL':
    case 'CRITIQUE':
    case 'C':
      return Severite.CRITICAL;
    case 'HIGH':
    case 'ÉLEVÉ':
    case 'ELEVE':
    case 'HAUTE':
    case 'H':
      return Severite.HIGH;
    case 'MEDIUM':
    case 'MOYEN':
    case 'MOYENNE':
    case 'MODERATE':
    case 'M':
      return Severite.MEDIUM;
    case 'LOW':
    case 'BAS':
    case 'FAIBLE':
    case 'L':
    case 'INFO':
    case 'INFORMATIONAL':
      return Severite.LOW;
    default:
      if (s.includes('CRITICAL') || s.includes('CRITIQUE')) return Severite.CRITICAL;
      if (s.includes('HIGH')     || s.includes('HAUT'))     return Severite.HIGH;
      if (s.includes('MEDIUM')   || s.includes('MOYEN'))    return Severite.MEDIUM;
      if (s.includes('LOW')      || s.includes('BAS'))      return Severite.LOW;
      console.warn(`[SEVERITY] ⚠️ Valeur inconnue: "${raw}" → MEDIUM`);
      return Severite.MEDIUM;
  }
}

// ============================================================
// TYPE DE VULNÉRABILITÉ
// ============================================================

function inferVulnerabilityType(item: PythonVulnerability): TypeVulnerabilite {
  const text = [
    item.titre ?? '', item.name ?? '',
    item.description ?? '', item.type ?? '',
  ].join(' ').toLowerCase();

  if (/xss|sqli|sql|csrf|injection|login|header|web|http|rce|nginx|phishing|clickjack/.test(text))
    return TypeVulnerabilite.WEB_APP;
  if (/smb|rdp|ssh|ssl|tls|dns|snmp|network|port|firewall|eternalblue/.test(text))
    return TypeVulnerabilite.NETWORK;
  if (/container|docker|image|pod|alpine/.test(text))
    return TypeVulnerabilite.CONTAINER;
  if (/depend|package|library|log4j|openssl|npm|pip/.test(text))
    return TypeVulnerabilite.DEPENDENCY;
  if (/cloud|aws|azure|gcp|s3/.test(text))
    return TypeVulnerabilite.CLOUD;
  return TypeVulnerabilite.OTHER;
}

// ============================================================
// SAUVEGARDE VULNÉRABILITÉS
// ============================================================

async function saveVulnerabilitiesFromPython(
  scanId  : string,
  data    : PythonVulnerability[],
  idActif : string
): Promise<number> {
  console.log(`📥 Enregistrement de ${data.length} vulnérabilités pour l'actif ${idActif}`);

  console.log('━'.repeat(60));
  data.forEach((v, i) => {
    console.log(
      `  [${i + 1}] titre="${v.titre ?? v.name}" | ` +
      `severite="${v.severite}" | severity="${v.severity}"`
    );
  });
  console.log('━'.repeat(60));

  const rows = data.map((item) => {
    const rawSev   = item.severite ?? item.severity ?? 'UNKNOWN';
    const severite = mapSeverity(rawSev);
    const cvss     = item.scoreCVSS ?? item.cvss ?? 0;
    const titre    = (item.titre ?? item.name ?? 'Vulnérabilité détectée').slice(0, 255);

    console.log(`[SAVE] "${titre}" | raw="${rawSev}" → ${severite}`);

    return {
      idScan            : scanId,
      idActif           : idActif,
      cveId             : item.cveId ?? item.cve ?? null,
      titre,
      description       : item.description ?? '',
      severite,
      scoreCVSS         : cvss,
      vecteurCVSS       : item.vecteurCVSS ?? item.vector ?? null,
      statut            : StatutVulnerabilite.OUVERTE,
      preuve            : item.preuve ?? item.url ?? JSON.stringify(item),
      recommandation    : item.recommandation ?? item.solution
                          ?? 'Appliquer les correctifs recommandés',
      risqueRelatif     : Math.min(10, cvss * 0.8),
      impact            : item.impact ?? item.threat ?? '',
      typeVulnerabilite : inferVulnerabilityType(item),
      dateDecouverte    : new Date(),
    };
  });

  const created = await prisma.vulnerabilite.createMany({
    data          : rows,
    skipDuplicates: true,
  });

  console.log(`✅ ${created.count} vulnérabilités importées (liées à l'actif ${idActif})`);
  return created.count;
}

// ============================================================
// ⭐ CRÉATION AUTO DES PLANS (CRITICAL + HIGH uniquement)
// ============================================================

async function creerPlansAutomatiques(
  scanId    : string,
  createdBy : string,
): Promise<void> {
  // Récupérer UNIQUEMENT les CRITICAL et HIGH sans plan existant
  const vulnsUrgentes = await prisma.vulnerabilite.findMany({
    where: {
      idScan   : scanId,
      statut   : StatutVulnerabilite.OUVERTE,
      deletedAt: null,
      severite : { in: [Severite.CRITICAL, Severite.HIGH] },
      plan     : { none: {} },  // Pas encore de plan
    }
  });

  if (vulnsUrgentes.length === 0) {
    console.log('[PLAN] Aucune faille CRITICAL/HIGH sans plan');
    return;
  }

  console.log(`[PLAN] 🎯 ${vulnsUrgentes.length} failles CRITICAL/HIGH → création automatique des plans`);

  for (const vuln of vulnsUrgentes) {
    try {
      const dateEcheance = calculerDateEcheance(
        vuln.severite as Severite,
        vuln.dateDecouverte
      );
      const priorite = PRIORITE_MAP[vuln.severite as Severite];

      await prisma.$transaction(async (tx) => {
        // Créer le plan
        await tx.planCorrection.create({
          data: {
            idVulnerabilite : vuln.id,
            priorite,
            dateEcheance,
            statut          : StatutPlan.A_FAIRE,
            commentaire     : `⚡ Auto-généré — ${vuln.severite} détectée lors du scan. Délai : ${DELAIS_JOURS[vuln.severite as Severite]} jours.`,
            createdBy,
          }
        });

        // Passer la vuln EN_COURS
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
      console.error(`[PLAN] ❌ Erreur pour "${vuln.titre}":`, err.message);
    }
  }

  // MEDIUM et LOW → log informatif seulement
  const vulnsMoyennes = await prisma.vulnerabilite.count({
    where: {
      idScan  : scanId,
      severite: { in: [Severite.MEDIUM, Severite.LOW] },
      statut  : StatutVulnerabilite.OUVERTE,
    }
  });

  if (vulnsMoyennes > 0) {
    console.log(
      `[PLAN] ℹ️  ${vulnsMoyennes} failles MEDIUM/LOW → en attente de triage manuel`
    );
  }
}

// ============================================================
// TRIGGER PRINCIPAL
// ============================================================

export async function triggerScanBackground(scanId: string) {
  console.log(`[SCAN START] Début du scan ${scanId}`);

  try {
    const scan = await prisma.scan.findUnique({
      where  : { id: scanId },
      include: { actif: true },
    });

    if (!scan)       throw new Error(`Scan ${scanId} introuvable`);
    if (!scan.cible) throw new Error(`Aucune cible définie pour le scan`);

    const { cible, outil, idActif } = scan;
    const scriptPath = path.join(process.cwd(), 'python-scanner', 'scan.py');

    console.log(`🎯 Cible : ${cible} | Outil : ${outil} | Actif : ${idActif}`);

    const command = [
      'python3', scriptPath,
      '--tool'   , outil.toLowerCase(),
      '--target' , cible,
      '--scan-id', scanId,
    ].join(' ');

    console.log(`[SCAN] Exécution : ${command}`);

    const { stdout, stderr } = await execAsync(command, { timeout: 300_000 });

    if (stderr) console.warn(`[Python stderr]: ${stderr}`);
    if (stdout) console.log(`[Python stdout]: ${stdout}`);

    let pythonResult: PythonScanResult;
    try {
      pythonResult = JSON.parse(stdout.trim());
    } catch {
      throw new Error(`JSON invalide du scanner:\n${stdout.substring(0, 300)}`);
    }

    // Import des vulnérabilités
    let nbVulns = 0;
    if (
      pythonResult.status === 'success' &&
      Array.isArray(pythonResult.data)  &&
      pythonResult.data.length > 0
    ) {
      nbVulns = await saveVulnerabilitiesFromPython(scanId, pythonResult.data, idActif);

      // ⭐ Création automatique des plans CRITICAL + HIGH
      await creerPlansAutomatiques(scanId, scan.lancerPar);
    } else {
      console.warn(`⚠️ Aucun résultat pour le scan ${scanId}`);
    }

    await postScanProcessing(scanId, nbVulns, scan.debut);

    return { success: true, scanId };

  } catch (error: any) {
    console.error(`❌ Erreur scan ${scanId}:`, error.message);

    await prisma.scan.update({
      where: { id: scanId },
      data : {
        statut: StatutScan.ECHEC,
        fin   : new Date(),
        erreur: error.message,
      },
    });

    throw error;
  }
}

// ============================================================
// POST-PROCESSING
// ============================================================

async function postScanProcessing(
  scanId  : string,
  nbVulns : number,
  debut   : Date | null
) {
  try {
    const now = new Date();

    await prisma.scan.update({
      where: { id: scanId },
      data : {
        statut : StatutScan.TERMINE,
        fin    : now,
        // ❌ nbVulnerabilites n'existe pas dans le schema
        // ✅ On stocke le nombre dans metadata (champ Json existant)
        metadata: {
          nbVulnerabilites: nbVulns,
          completedAt     : now.toISOString(),
        },
        duree  : debut
                 ? Math.floor((now.getTime() - debut.getTime()) / 1000)
                 : undefined,
      },
    });

    const scan = await prisma.scan.findUnique({ where: { id: scanId } });
    if (!scan) return;

    await prisma.actif.update({
      where: { id: scan.idActif },
      data : { dernierScan: now },
    });

    console.log(`✅ [SCAN SUCCESS] Scan ${scanId} terminé - ${nbVulns} vulnérabilités`);

    await sendScanCompletionAlert(scanId);

  } catch (error: any) {
    console.error('Erreur post-traitement:', error.message);
  }
}

// ============================================================
// ALERTE SSE
// ============================================================

async function sendScanCompletionAlert(scanId: string) {
  try {
    const scan = await prisma.scan.findUnique({
      where  : { id: scanId },
      include: { vulnerabilites: true },
    });

    if (!scan) return;

    const nbCritiques = scan.vulnerabilites.filter(
      v => v.severite === Severite.CRITICAL
    ).length;

    await prisma.auditLog.create({
      data: {
        action  : 'SCAN_COMPLETED',
        entite  : 'SCAN',
        idEntite: scanId,
        details : {
          cible           : scan.cible,
          outil           : scan.outil,
          nbVulnerabilites: scan.vulnerabilites.length,
          nbCritiques,
        },
      },
    });

    broadcastScanCompleted({
      scanId,
      cible           : scan.cible ?? '',
      nbVulnerabilites: scan.vulnerabilites.length,
      nbCritiques,
      message         : nbCritiques > 0
                        ? `🚨 ${nbCritiques} vulnérabilité(s) critique(s) détectée(s)`
                        : `✅ Scan terminé sans critique`,
    });

  } catch (err: any) {
    console.error('Erreur alerte:', err.message);
  }
}