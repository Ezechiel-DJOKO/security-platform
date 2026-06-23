// src/lib/scanner/postScanProcessor.ts
import { prisma } from '@/lib/prisma';
import { Severite, StatutVulnerabilite, Priorite } from '@prisma/client';

interface RawVulnerability {
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
  solution?: string;
  recommandation?: string;
  impact?: string;
  threat?: string;
}

interface RawResults {
  data?: RawVulnerability[];
  vulnerabilities?: RawVulnerability[];
  results?: RawVulnerability[];
}

export async function processScanResults(scanId: string): Promise<{ mappingsCreated: number }> {
  console.log(`🔄 Post-traitement du scan ${scanId}`);

  const scan = await prisma.scan.findUnique({
    where: { id: scanId },
    include: { actif: true, vulnerabilites: true }
  });

  if (!scan) {
    console.error("Scan non trouvé");
    return { mappingsCreated: 0 };
  }

  console.log(`📊 ${scan.vulnerabilites.length} vulnérabilités déjà enregistrées`);

  // Si aucune vulnérabilité n'a été créée par le Python, on parse le résultat brut
  if (scan.vulnerabilites.length === 0 && scan.resultatBrut) {
    await parseAndCreateVulnerabilities(scanId, scan.resultatBrut as RawResults);
  }

  // === PLUS DE CRÉATION AUTOMATIQUE DE PLANS ===
  console.log(`✅ Post-traitement terminé pour le scan ${scanId} - Aucuns plans créés automatiquement`);

  return { mappingsCreated: 0 };
}

async function parseAndCreateVulnerabilities(scanId: string, rawResults: RawResults) {
  const vulnerabilities = rawResults.data ||
                         rawResults.vulnerabilities ||
                         rawResults.results ||
                         (Array.isArray(rawResults) ? rawResults : []);

  const vulnArray = Array.isArray(vulnerabilities) ? vulnerabilities : [];

  console.log(`📥 Parsing de ${vulnArray.length} vulnérabilités brutes`);

  for (const vuln of vulnArray) {
    try {
      await prisma.vulnerabilite.create({
        data: {
          idScan: scanId,
          cveId: vuln.cveId || vuln.cve || null,
          titre: vuln.titre || vuln.name || 'Vulnérabilité détectée',
          description: vuln.description || '',
          severite: mapSeverity(vuln.severite || vuln.severity),
          scoreCVSS: vuln.scoreCVSS || vuln.cvss || null,
          vecteurCVSS: vuln.vecteurCVSS || vuln.vector || null,
          statut: StatutVulnerabilite.OUVERTE,
          preuve: vuln.preuve || JSON.stringify(vuln),
          recommandation: vuln.recommandation || vuln.solution || "Appliquer les correctifs recommandés",
          risqueRelatif: calculateRiskScore(vuln.scoreCVSS || vuln.cvss || 0),
          dateDecouverte: new Date(),
          impact: vuln.impact || vuln.threat || '',
        }
      });
    } catch (err) {
      console.error("Erreur création vulnérabilité:", err);
    }
  }
}

function mapSeverity(severity: string | undefined): Severite {
  if (!severity) return Severite.LOW;
  const s = severity.toLowerCase();
  if (s.includes('critical')) return Severite.CRITICAL;
  if (s.includes('high')) return Severite.HIGH;
  if (s.includes('medium')) return Severite.MEDIUM;
  return Severite.LOW;
}

function calculateRiskScore(cvss: number): number {
  return Math.min(10, Math.max(0, (cvss || 0) * 0.8));
}