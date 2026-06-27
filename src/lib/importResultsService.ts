// src/lib/importResultsService.ts
import { prisma } from '@/lib/prisma';
import { Severite, StatutVulnerabilite, OutilScan, TypeVulnerabilite } from '@prisma/client';

interface Finding {
  name?: string;
  title?: string;
  template?: { name?: string };
  description?: string;
  info?: any;
  cve_id?: any;
  cveId?: any;
  cvss?: any;
  scoreCVSS?: any;
  severity?: string;
  recommandation?: string;
  remediation?: string;
  impact?: string;
  host?: string;
  url?: string;
  endpoint?: string;
  method?: string;
  payload?: string;
  type?: string;           // ← Nouveau (pour aider l'inférence)
}

export async function importResultsToPrisma(
  scanId: string,
  result: any,
  tool: OutilScan = 'MANUAL',
  idActif?: string                     // ← NOUVEAU PARAMÈTRE
) {
  try {
    let findings = Array.isArray(result.data) ? result.data :
                   Array.isArray(result) ? result : [];

    if (findings.length === 0) {
      console.log(`ℹ️ Aucun finding pour le scan ${scanId}`);
      return { success: true, imported: 0 };
    }

    const vulnsToCreate = findings.map((finding: Finding) => {
      const titre = (finding.name || finding.title || finding.template?.name || "Vulnérabilité détectée").slice(0, 255);

      const isWebVuln = !!(finding.url || finding.endpoint || 
                          (finding.template?.name && /http|web|xss|sqli|csrf|header/i.test(finding.template.name)));

      return {
        idScan: scanId,
        idActif: idActif,                    // ← IMPORTANT : liaison avec l'actif
        cveId: Array.isArray(finding.cve_id) ? finding.cve_id[0] : (finding.cve_id || finding.cveId),
        titre,
        description: finding.description || finding.info?.description || null,
        severite: determineSeverity(finding),
        scoreCVSS: parseScore(finding.cvss || finding.scoreCVSS || finding.info?.classification?.cvss),
        statut: StatutVulnerabilite.OUVERTE,
        preuve: JSON.stringify(finding),
        recommandation: finding.recommandation || finding.remediation || null,
        impact: finding.impact || null,
        
        // Type de vulnérabilité amélioré
        typeVulnerabilite: determineVulnType(finding, isWebVuln),
        
        urlCible: finding.url || null,
        endpoint: finding.endpoint || finding.host || null,
        methodeHttp: finding.method || null,
        payload: finding.payload || null,
      };
    });

    const created = await prisma.vulnerabilite.createMany({
      data: vulnsToCreate,
      skipDuplicates: true,
    });

    // Mise à jour du scan
    await prisma.scan.update({
      where: { id: scanId },
      data: {
        resultatBrut: result,
        statut: 'TERMINE',
        metadata: {
          totalVulnerabilites: created.count,
          tool,
          parserVersion: "2.4-actif-linked"
        }
      }
    });

    console.log(`✅ ${created.count} vulnérabilités importées (liées à l'actif ${idActif})`);
    return { success: true, imported: created.count };

  } catch (error: any) {
    console.error("❌ Erreur dans importResultsToPrisma:", error);
    throw error;
  }
}

// ==================== HELPERS AMÉLIORÉS ====================
function determineSeverity(finding: any): Severite {
  const score = parseScore(finding.cvss || finding.scoreCVSS);
  if (score !== null) {
    if (score >= 9.0) return Severite.CRITICAL;
    if (score >= 7.0) return Severite.HIGH;
    if (score >= 4.0) return Severite.MEDIUM;
    return Severite.LOW;
  }

  const sev = String(finding.severity || finding.info?.severity || '').toLowerCase();
  if (sev.includes('crit')) return Severite.CRITICAL;
  if (sev.includes('high')) return Severite.HIGH;
  if (sev.includes('med')) return Severite.MEDIUM;
  return Severite.LOW;
}

function parseScore(score: any): number | null {
  if (score == null) return null;
  const num = typeof score === 'string' ? parseFloat(score) : Number(score);
  return isNaN(num) ? null : num;
}

function determineVulnType(finding: Finding, isWebVuln: boolean): TypeVulnerabilite {
  const text = `${finding.name} ${finding.title} ${finding.description} ${finding.type || ''}`.toLowerCase();

  if (isWebVuln || /xss|sqli|csrf|injection|header/i.test(text)) return TypeVulnerabilite.WEB_APP;
  if (/network|port|firewall|protocol/i.test(text)) return TypeVulnerabilite.NETWORK;
  if (/container|docker|image|pod/i.test(text)) return TypeVulnerabilite.CONTAINER;
  if (/depend|package|library|npm|pip/i.test(text)) return TypeVulnerabilite.DEPENDENCY;
  if (/cloud|aws|azure|gcp/i.test(text)) return TypeVulnerabilite.CLOUD;
  if (/config|misconfig|permission/i.test(text)) return TypeVulnerabilite.CONFIG;

  return TypeVulnerabilite.OTHER;
}