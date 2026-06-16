// src/lib/importResultsService.ts
import { prisma } from '@/lib/prisma';
import { Severite, StatutVulnerabilite } from '@prisma/client';

interface ScanResult {
  scanner?: string;
  target?: string;
  data?: any[];
  scan_id?: string;
  findings?: number;
  [key: string]: any;
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
      const titre = finding.name || finding.title || finding.template?.name || finding.vulnerability?.id || "Vulnérabilité détectée";
      const description = finding.description || finding.info?.description || finding.vulnerability?.description || "";
      
      let cveId = finding.cve_id || finding.cveId || finding.info?.classification?.["cve-id"]?.[0] || null;
      if (Array.isArray(cveId)) cveId = cveId[0];

      const scoreCVSS = finding.cvss || finding.scoreCVSS || finding.info?.classification?.cvss || null;

      // Détermination de la sévérité
      let severite: Severite = Severite.MEDIUM;
      if (scoreCVSS) {
        const score = parseFloat(scoreCVSS.toString());
        if (score >= 9.0) severite = Severite.CRITICAL;
        else if (score >= 7.0) severite = Severite.HIGH;
        else if (score >= 4.0) severite = Severite.MEDIUM;
        else severite = Severite.LOW;
      } else if (finding.severity || finding.info?.severity) {
        const sev = String(finding.severity || finding.info?.severity).toUpperCase();
        if (['CRITICAL', 'CRITIQUE'].includes(sev)) severite = Severite.CRITICAL;
        else if (['HIGH', 'HAUTE'].includes(sev)) severite = Severite.HIGH;
        else if (['MEDIUM', 'MOYEN'].includes(sev)) severite = Severite.MEDIUM;
        else if (['LOW', 'BASSE'].includes(sev)) severite = Severite.LOW;
      }

      const vuln = await prisma.vulnerabilite.create({
  data: {
    idScan: scanId,
    cveId: cveId,
    titre: titre.length > 255 ? titre.substring(0, 252) + "..." : titre,
    description: description || null,
    severite,
    scoreCVSS: scoreCVSS ? parseFloat(scoreCVSS.toString()) : null,
    statut: StatutVulnerabilite.OUVERTE,
    // Stocke les métadonnées dans preuve comme JSON
    preuve: JSON.stringify({
      scanner: result.scanner || "unknown",
      rawFinding: finding,
      importedAt: new Date().toISOString(),
    }),
    recommandation: finding.recommandation || finding.remediation || null,
    impact: finding.impact || null,
    // ❌ SUPPRIME le bloc metadata ici
  }
});

      importedVulns.push(vuln);
    }

    // Mise à jour finale du scan
    await prisma.scan.update({
      where: { id: scanId },
      data: {
        resultatBrut: result,
        metadata: {
          totalVulnerabilites: importedVulns.length,
          importCompletedAt: new Date(),
          scanner: result.scanner
        }
      }
    });

    console.log(`✅ ${importedVulns.length} vulnérabilités importées avec succès !`);
    return { success: true, imported: importedVulns.length };

  } catch (error: any) {
    console.error("❌ Erreur lors de l'import des résultats:", error);
    throw new Error(`Échec import Prisma : ${error.message}`);
  }
}