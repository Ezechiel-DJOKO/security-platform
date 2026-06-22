// src/lib/importResultsService.ts
import { prisma } from '@/lib/prisma';
import { Severite, StatutVulnerabilite } from '@prisma/client';

// Define proper types
interface Finding {
  name?: string;
  title?: string;
  template?: {
    name?: string;
  };
  vulnerability?: {
    id?: string;
    description?: string;
  };
  description?: string;
  info?: {
    description?: string;
    severity?: string;
    classification?: {
      "cve-id"?: string | string[];
      cvss?: string | number;
    };
  };
  cve_id?: string | string[];
  cveId?: string | string[];
  cvss?: string | number;
  scoreCVSS?: string | number;
  severity?: string;
  recommandation?: string;
  remediation?: string;
  impact?: string;
}

interface ScanResult {
  scanner?: string;
  target?: string;
  data?: Finding[];
  scan_id?: string;
  findings?: number;
  [key: string]: unknown;
}

interface ImportError extends Error {
  message: string;
}

// Helper function to safely extract CVE ID
function extractCveId(cveField: string | string[] | undefined): string | null {
  if (!cveField) return null;
  if (Array.isArray(cveField)) {
    return cveField[0] || null;
  }
  return cveField;
}

// Helper function to safely parse score
function parseScore(score: string | number | undefined): number | null {
  if (!score) return null;
  const parsed = typeof score === 'string' ? parseFloat(score) : score;
  return isNaN(parsed) ? null : parsed;
}

// Helper function to map severity from score
function determineSeverityFromScore(score: number): Severite {
  if (score >= 9.0) return Severite.CRITICAL;
  if (score >= 7.0) return Severite.HIGH;
  if (score >= 4.0) return Severite.MEDIUM;
  return Severite.LOW;
}

// Helper function to map severity from string
function determineSeverityFromString(severity: string): Severite | null {
  const sev = severity.toUpperCase();
  if (['CRITICAL', 'CRITIQUE'].includes(sev)) return Severite.CRITICAL;
  if (['HIGH', 'HAUTE'].includes(sev)) return Severite.HIGH;
  if (['MEDIUM', 'MOYEN'].includes(sev)) return Severite.MEDIUM;
  if (['LOW', 'BASSE'].includes(sev)) return Severite.LOW;
  return null;
}

// Helper function to truncate title
function truncateTitle(title: string, maxLength: number = 255): string {
  if (title.length <= maxLength) return title;
  return title.substring(0, maxLength - 3) + "...";
}

export async function importResultsToPrisma(scanId: string, result: ScanResult) {
  try {
    const findings = Array.isArray(result.data) ? result.data : [];
    
    if (findings.length === 0) {
      console.log(`ℹ️ Aucun finding à importer pour le scan ${scanId}`);
      return { imported: 0 };
    }

    console.log(`📥 Importation de ${findings.length} vulnérabilités pour le scan ${scanId}...`);

    const importedVulns = [];

    for (const finding of findings) {
      // Extract title
      const titre = finding.name || 
                    finding.title || 
                    finding.template?.name || 
                    finding.vulnerability?.id || 
                    "Vulnérabilité détectée";

      // Extract description
      const description = finding.description || 
                         finding.info?.description || 
                         finding.vulnerability?.description || 
                         "";

      // Extract CVE ID
      const cveId = extractCveId(finding.cve_id || finding.cveId || finding.info?.classification?.["cve-id"]);

      // Extract CVSS score
      const scoreCVSS = parseScore(finding.cvss || finding.scoreCVSS || finding.info?.classification?.cvss);

      // Determine severity
      let severite: Severite = Severite.MEDIUM;
      
      if (scoreCVSS !== null) {
        severite = determineSeverityFromScore(scoreCVSS);
      } else if (finding.severity || finding.info?.severity) {
        const severityString = String(finding.severity || finding.info?.severity);
        const mappedSeverity = determineSeverityFromString(severityString);
        if (mappedSeverity) {
          severite = mappedSeverity;
        }
      }

      const truncatedTitle = truncateTitle(titre);

      const vuln = await prisma.vulnerabilite.create({
        data: {
          idScan: scanId,
          cveId: cveId,
          titre: truncatedTitle,
          description: description || null,
          severite,
          scoreCVSS: scoreCVSS,
          statut: StatutVulnerabilite.OUVERTE,
          preuve: JSON.stringify({
            scanner: result.scanner || "unknown",
            rawFinding: finding,
            importedAt: new Date().toISOString(),
          }),
          recommandation: finding.recommandation || finding.remediation || null,
          impact: finding.impact || null,
        }
      });

      importedVulns.push(vuln);
    }

    // Mise à jour finale du scan
    await prisma.scan.update({
      where: { id: scanId },
      data: {
        resultatBrut: result as unknown as any,
        metadata: {
          totalVulnerabilites: importedVulns.length,
          importCompletedAt: new Date(),
          scanner: result.scanner
        }
      }
    });

    console.log(`✅ ${importedVulns.length} vulnérabilités importées avec succès !`);
    return { success: true, imported: importedVulns.length };

  } catch (error) {
    const err = error as ImportError;
    console.error("❌ Erreur lors de l'import des résultats:", err);
    throw new Error(`Échec import Prisma : ${err.message}`);
  }
}