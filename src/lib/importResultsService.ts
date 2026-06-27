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
}

export async function importResultsToPrisma(
  scanId: string, 
  result: any,
  tool: OutilScan = 'MANUAL'
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
        cveId: Array.isArray(finding.cve_id) ? finding.cve_id[0] : (finding.cve_id || finding.cveId),
        titre,
        description: finding.description || finding.info?.description || null,
        severite: determineSeverity(finding),
        scoreCVSS: parseScore(finding.cvss || finding.scoreCVSS || finding.info?.classification?.cvss),
        statut: StatutVulnerabilite.OUVERTE,
        preuve: JSON.stringify(finding),
        recommandation: finding.recommandation || finding.remediation || null,
        impact: finding.impact || null,

        // Champs Web (maintenant disponibles grâce à la migration)
        typeVulnerabilite: isWebVuln ? TypeVulnerabilite.WEB_APP : TypeVulnerabilite.NETWORK,
        urlCible: finding.url || null,
        endpoint: finding.endpoint || null,
        methodeHttp: finding.method || null,
        payload: finding.payload || null,
      };
    });

    const created = await prisma.vulnerabilite.createMany({
      data: vulnsToCreate,
      skipDuplicates: true,
    });

    await prisma.scan.update({
      where: { id: scanId },
      data: {
        resultatBrut: result,
        statut: 'TERMINE',
        metadata: {
          totalVulnerabilites: created.count,
          tool,
          parserVersion: "2.3-web"
        }
      }
    });

    console.log(`✅ ${created.count} vulnérabilités importées avec succès (Web support activé)`);
    return { success: true, imported: created.count };

  } catch (error: any) {
    console.error("❌ Erreur dans importResultsToPrisma:", error);
    throw error;
  }
}

// Helpers
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