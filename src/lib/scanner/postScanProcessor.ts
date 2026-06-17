// src/lib/scanner/postScanProcessor.ts
import { prisma } from '@/lib/prisma';
import { Severite, StatutVulnerabilite, Priorite } from '@prisma/client';

export async function processScanResults(scanId: string) {
  console.log(`🔄 Post-traitement du scan ${scanId}`);

  const scan = await prisma.scan.findUnique({
    where: { id: scanId },
    include: { actif: true, vulnerabilites: true }
  });

  if (!scan) {
    console.error("Scan non trouvé");
    return;
  }

  console.log(`📊 ${scan.vulnerabilites.length} vulnérabilités déjà enregistrées`);

  // Si aucune vulnérabilité n'a été créée par le Python, on tente de parser le brut
  if (scan.vulnerabilites.length === 0 && scan.resultatBrut) {
    await parseAndCreateVulnerabilities(scanId, scan.resultatBrut as any);
  }

  // === CRÉATION DES PLANS DE CORRECTION ===
  await createRemediationPlans(scanId);

  console.log(`✅ Post-traitement terminé pour le scan ${scanId}`);
}

async function parseAndCreateVulnerabilities(scanId: string, rawResults: any) {
  const vulnerabilities = rawResults.data || rawResults.vulnerabilities || rawResults.results || rawResults || [];

  console.log(`📥 Parsing de ${vulnerabilities.length} vulnérabilités brutes`);

  for (const vuln of vulnerabilities) {
    try {
      await prisma.vulnerabilite.create({
        data: {
          idScan: scanId,
          cveId: vuln.cveId || vuln.cve,
          titre: vuln.titre || vuln.name || 'Vulnérabilité détectée',
          description: vuln.description,
          severite: mapSeverity(vuln.severite || vuln.severity),
          scoreCVSS: vuln.scoreCVSS || vuln.cvss,
          vecteurCVSS: vuln.vecteurCVSS || vuln.vector,
          statut: StatutVulnerabilite.OUVERTE,
          preuve: vuln.preuve || JSON.stringify(vuln),
          recommandation: vuln.recommandation || vuln.solution || "Appliquer les correctifs recommandés",
          risqueRelatif: calculateRiskScore(vuln.scoreCVSS || vuln.cvss || 0),
          dateDecouverte: new Date(),
          impact: vuln.impact || vuln.threat,
        }
      });
    } catch (err) {
      console.error("Erreur création vulnérabilité:", err);
    }
  }
}

// ==================== CRÉATION PLANS ====================
async function createRemediationPlans(scanId: string) {
  try {
    const vulnerabilites = await prisma.vulnerabilite.findMany({
      where: {
        idScan: scanId,
        plan: null,                    // Relation correcte
      },
      include: { scan: true }
    });

    console.log(`🛠️ ${vulnerabilites.length} vulnérabilités sans plan de correction`);

    if (vulnerabilites.length === 0) return;

    for (const vuln of vulnerabilites) {
      await prisma.planCorrection.create({
        data: {
          idVulnerabilite: vuln.id,
          assigneA: vuln.assigneA || vuln.scan?.lancerPar || "00000000-0000-0000-0000-000000000000", // ID admin par défaut
          priorite: getPrioriteFromSeverite(vuln.severite),
          dateEcheance: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          statut: 'A_FAIRE',
          commentaire: `Plan généré automatiquement après scan ${vuln.scan?.outil || 'automatique'}`,
        }
      });
      console.log(`✅ Plan créé pour vulnérabilité ${vuln.titre} (${vuln.severite})`);
    }
  } catch (error) {
    console.error("❌ Erreur createRemediationPlans:", error);
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

function getPrioriteFromSeverite(severite: Severite): Priorite {
  switch (severite) {
    case Severite.CRITICAL: return Priorite.CRITIQUE;
    case Severite.HIGH: return Priorite.HAUTE;
    case Severite.MEDIUM: return Priorite.MOYENNE;
    default: return Priorite.BASSE;
  }
}

function calculateRiskScore(cvss: number): number {
  return Math.min(10, Math.max(0, (cvss || 0) * 0.8));
}