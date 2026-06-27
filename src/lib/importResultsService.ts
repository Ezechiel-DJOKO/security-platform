// src/lib/importResultsService.ts
import { prisma } from '@/lib/prisma';
import {
  Severite,
  StatutVulnerabilite,
  OutilScan,
  TypeVulnerabilite,
} from '@prisma/client';

// ============================================================
// TYPES
// ============================================================

interface Finding {
  name?       : string;
  titre?      : string;
  title?      : string;
  template?   : { name?: string };

  description?: string;
  info?       : {
    severity?      : string;
    description?   : string;
    classification?: { cvss?: number | string };
  };

  cve_id?     : string | string[];
  cveId?      : string;
  cvss?       : number | string;
  scoreCVSS?  : number | string;

  // ⭐ Tous les alias de sévérité
  severite?   : string;   // Python français  — PRIORITÉ 1
  severity?   : string;   // Anglais / nuclei — PRIORITÉ 2
  sev?        : string;   // Abréviation      — PRIORITÉ 3

  recommandation? : string;
  remediation?    : string;
  solution?       : string;

  impact?     : string;
  threat?     : string;
  preuve?     : string;

  url?        : string;
  endpoint?   : string;
  host?       : string;
  method?     : string;
  methodeHttp?: string;
  payload?    : string;

  idActif?    : string;
  idScan?     : string;
  type?       : string;
  typeVulnerabilite? : TypeVulnerabilite;
  dateDecouverte?    : Date | string;
}

// ============================================================
// ⭐ MAPPING SÉVÉRITÉ — SOURCE UNIQUE
// ============================================================

export function mapSeverityRobust(raw: unknown): Severite {
  const s = String(raw ?? '').toUpperCase().trim();

  console.log(`[SEVERITY] raw="${raw}" → normalized="${s}"`);

  const table: Record<string, Severite> = {
    'CRITICAL'      : Severite.CRITICAL,
    'CRITIQUE'      : Severite.CRITICAL,
    'C'             : Severite.CRITICAL,
    'HIGH'          : Severite.HIGH,
    'ÉLEVÉ'         : Severite.HIGH,
    'ELEVE'         : Severite.HIGH,
    'HAUTE'         : Severite.HIGH,
    'H'             : Severite.HIGH,
    'MEDIUM'        : Severite.MEDIUM,
    'MOYEN'         : Severite.MEDIUM,
    'MOYENNE'       : Severite.MEDIUM,
    'MODERATE'      : Severite.MEDIUM,
    'M'             : Severite.MEDIUM,
    'LOW'           : Severite.LOW,
    'BAS'           : Severite.LOW,
    'FAIBLE'        : Severite.LOW,
    'L'             : Severite.LOW,
    'INFO'          : Severite.LOW,
    'INFORMATIONAL' : Severite.LOW,
    'NONE'          : Severite.LOW,
  };

  // Correspondance exacte
  if (s in table) {
    console.log(`[SEVERITY] ✅ "${s}" → ${table[s]}`);
    return table[s];
  }

  // Correspondance partielle
  if (s.includes('CRITICAL') || s.includes('CRITIQUE')) return Severite.CRITICAL;
  if (s.includes('HIGH')     || s.includes('HAUT'))     return Severite.HIGH;
  if (s.includes('MEDIUM')   || s.includes('MOYEN'))    return Severite.MEDIUM;
  if (s.includes('LOW')      || s.includes('BAS'))      return Severite.LOW;
  if (s.includes('INFO'))                               return Severite.LOW;

  console.warn(`[SEVERITY] ⚠️ Inconnu: "${raw}" → MEDIUM`);
  return Severite.MEDIUM;
}

// ============================================================
// DÉTERMINATION SÉVÉRITÉ D'UN FINDING
// ============================================================

function determineSeverity(finding: Finding): Severite {
  // ⭐ Lire dans l'ordre de priorité
  const rawSev =
    finding.severite        ??   // Python français  — PRIORITÉ 1
    finding.severity        ??   // Anglais          — PRIORITÉ 2
    finding.sev             ??   // Abréviation      — PRIORITÉ 3
    finding.info?.severity;      // Nuclei block     — PRIORITÉ 4

  console.log(
    `[DETERMINE_SEV] severite="${finding.severite}" | ` +
    `severity="${finding.severity}" | ` +
    `info.severity="${finding.info?.severity}" | ` +
    `→ rawSev="${rawSev}"`
  );

  // Sévérité textuelle trouvée
  if (rawSev && String(rawSev).trim() !== '') {
    return mapSeverityRobust(rawSev);
  }

  // Fallback score CVSS
  const score = parseScore(
    finding.cvss      ??
    finding.scoreCVSS ??
    finding.info?.classification?.cvss
  );

  if (score !== null) {
    console.log(`[DETERMINE_SEV] Fallback CVSS: ${score}`);
    if (score >= 9.0) return Severite.CRITICAL;
    if (score >= 7.0) return Severite.HIGH;
    if (score >= 4.0) return Severite.MEDIUM;
    return Severite.LOW;
  }

  console.warn(`[DETERMINE_SEV] ⚠️ Aucune sévérité → MEDIUM`);
  return Severite.MEDIUM;
}

// ============================================================
// IMPORT PRINCIPAL
// ============================================================

export async function importResultsToPrisma(
  scanId   : string,
  result   : any,
  tool     : OutilScan = 'MANUAL',
  idActif? : string
) {
  try {
    const findings: Finding[] =
      Array.isArray(result.data) ? result.data :
      Array.isArray(result)      ? result       : [];

    if (findings.length === 0) {
      console.log(`ℹ️ Aucun finding pour le scan ${scanId}`);
      return { success: true, imported: 0 };
    }

    // Log diagnostic
    console.log('━'.repeat(60));
    console.log(`[IMPORT] ${findings.length} findings reçus :`);
    findings.forEach((f, i) => {
      console.log(
        `  [${i + 1}] titre="${f.titre ?? f.name ?? f.title}" | ` +
        `severite="${f.severite}" | severity="${f.severity}" | ` +
        `idActif="${f.idActif ?? idActif}"`
      );
    });
    console.log('━'.repeat(60));

    const vulnsToCreate = findings.map((finding: Finding) => {
      const titre = (
        finding.titre          ??
        finding.name           ??
        finding.title          ??
        finding.template?.name ??
        'Vulnérabilité détectée'
      ).slice(0, 255);

      // ⭐ Sévérité via determineSeverity (lit severite EN PRIORITÉ)
      const severite  = determineSeverity(finding);
      const cvssRaw   = finding.cvss ?? finding.scoreCVSS ?? finding.info?.classification?.cvss;
      const scoreCVSS = parseScore(cvssRaw) ?? 0;
      const cveId     = Array.isArray(finding.cve_id)
                        ? finding.cve_id[0]
                        : (finding.cve_id ?? finding.cveId ?? null);
      const actifId   = finding.idActif ?? idActif ?? null;
      const isWebVuln = !!(
        finding.url ?? finding.endpoint ??
        (finding.template?.name && /http|web|xss|sqli|csrf|header/i.test(finding.template.name))
      );

      console.log(
        `[IMPORT] "${titre}" | severite="${severite}" | actif="${actifId}" | cvss=${scoreCVSS}`
      );

      return {
        idScan            : scanId,
        idActif           : actifId,
        cveId,
        titre,
        description       : finding.description ?? finding.info?.description ?? null,
        severite,
        scoreCVSS,
        statut            : StatutVulnerabilite.OUVERTE,
        preuve            : finding.preuve ?? JSON.stringify(finding),
        recommandation    : finding.recommandation ?? finding.remediation ?? finding.solution ?? null,
        impact            : finding.impact ?? finding.threat ?? null,
        typeVulnerabilite : determineVulnType(finding, isWebVuln),
        urlCible          : finding.url      ?? null,
        endpoint          : finding.endpoint ?? finding.host ?? null,
        methodeHttp       : finding.method   ?? finding.methodeHttp ?? null,
        payload           : finding.payload  ?? null,
        dateDecouverte    : finding.dateDecouverte
                            ? new Date(finding.dateDecouverte as string)
                            : new Date(),
      };
    });

    const created = await prisma.vulnerabilite.createMany({
      data          : vulnsToCreate,
      skipDuplicates: true,
    });

    await prisma.scan.update({
      where: { id: scanId },
      data : {
        resultatBrut    : result,
        statut          : 'TERMINE',
        nbVulnerabilites: created.count,
        metadata        : {
          totalVulnerabilites: created.count,
          tool,
          parserVersion      : '3.0-severity-fixed',
        },
      },
    });

    console.log(`✅ ${created.count} vulnérabilités importées (liées à l'actif ${idActif})`);
    return { success: true, imported: created.count };

  } catch (error: any) {
    console.error('❌ Erreur dans importResultsToPrisma:', error);

    if (error.code === 'P2002') {
      console.error('[IMPORT] Doublon détecté');
    }
    if (error.code === 'P2003') {
      console.error('[IMPORT] Clé étrangère invalide — idActif:', idActif);
    }
    if (error.message?.includes('severite')) {
      console.error('[IMPORT] Enum Severite invalide — valeurs acceptées:', Object.values(Severite));
    }

    throw error;
  }
}

// ============================================================
// HELPERS
// ============================================================

function parseScore(score: unknown): number | null {
  if (score == null) return null;
  const num = typeof score === 'string' ? parseFloat(score) : Number(score);
  return isNaN(num) ? null : num;
}

function determineVulnType(finding: Finding, isWebVuln: boolean): TypeVulnerabilite {
  const text = [
    finding.titre, finding.name, finding.title,
    finding.description, finding.type ?? '',
  ].join(' ').toLowerCase();

  if (isWebVuln || /xss|sqli|csrf|injection|header|login|web|http|phishing|clickjack/.test(text)) {
    return TypeVulnerabilite.WEB_APP;
  }
  if (/smb|rdp|ssh|ssl|tls|dns|snmp|network|port|firewall|nginx|rce|eternalblue/.test(text)) {
    return TypeVulnerabilite.NETWORK;
  }
  if (/container|docker|image|pod|alpine/.test(text)) {
    return TypeVulnerabilite.CONTAINER;
  }
  if (/depend|package|library|log4j|openssl|npm|pip/.test(text)) {
    return TypeVulnerabilite.DEPENDENCY;
  }
  if (/cloud|aws|azure|gcp|s3/.test(text)) {
    return TypeVulnerabilite.CLOUD;
  }
  if (/config|misconfig|permission|setting/.test(text)) {
    return TypeVulnerabilite.CONFIG;
  }
  return TypeVulnerabilite.OTHER;
}