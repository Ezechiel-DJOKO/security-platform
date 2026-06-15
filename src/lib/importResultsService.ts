import { prisma } from '@/lib/prisma';
import { Severite, StatutVulnerabilite } from '@prisma/client';

interface ScanResult {
  scanner?: string;
  target?: string;
  data?: any[];           // Tableau des findings du scanner
  scan_id?: string;
  [key: string]: any;
}

export async function importResultsToPrisma(scanId: string, result: ScanResult) {
  try {
    const findings = Array.isArray(result.data) ? result.data : [];

    if (findings.length === 0) {
      console.log(`Aucun finding à importer pour le scan ${scanId}`);
      return { imported: 0 };
    }

    console.log(`Importation de ${findings.length} vulnérabilités pour le scan ${scanId}...`);

    const importedVulns = [];

    for (const finding of findings) {
      // Mapping selon le scanner (OpenVAS / Nuclei / Grype)
      const titre = finding.name || finding.title || finding.template?.name || finding.vulnerability?.id || "Vulnérabilité non nommée";
      const description = finding.description || finding.info?.description || finding.vulnerability?.description || "";
      
      let cveId = finding.cve_id || finding.info?.classification?.["cve-id"]?.[0] || finding.vulnerability?.id || null;
      if (Array.isArray(cveId)) cveId = cveId[0];

      const scoreCVSS = finding.cvss || finding.info?.classification?.cvss || finding.vulnerability?.cvss || finding.scoreCVSS || null;
      let severite: Severite = Severite.MEDIUM;

      if (scoreCVSS) {
        if (scoreCVSS >= 9.0) severite = Severite.CRITICAL;
        else if (scoreCVSS >= 7.0) severite = Severite.HIGH;
        else if (scoreCVSS >= 4.0) severite = Severite.MEDIUM;
        else severite = Severite.LOW;
      } else if (finding.severity || finding.info?.severity) {
        const sev = (finding.severity || finding.info?.severity).toUpperCase();
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
          cvssVersion: finding.cvssVersion || null,
          statut: StatutVulnerabilite.OUVERTE,
          preuve: finding.proof || finding.matched || finding.info?.description || null,
          recommandation: finding.recommendation || finding.remediation || finding.info?.remediation || null,
          impact: finding.impact || null,
          metadata: {
            scanner: result.scanner || "openvas",
            rawFinding: finding,
            importedAt: new Date().toISOString()
          }
        }
      });

      importedVulns.push(vuln);
    }

    // Mise à jour du scan avec le nombre de vulnérabilités
    await prisma.scan.update({
      where: { id: scanId },
      data: {
        resultatBrut: result,
        metadata: {
          ...(typeof result.metadata === 'object' ? result.metadata : {}),
          totalVulnerabilites: importedVulns.length,
          importCompletedAt: new Date()
        }
      }
    });

    console.log(`✅ ${importedVulns.length} vulnérabilités importées avec succès pour le scan ${scanId}`);

    return {
      success: true,
      imported: importedVulns.length,
      vulnerabilities: importedVulns
    };

  } catch (error: any) {
    console.error("Erreur lors de l'import des résultats:", error);
    throw new Error(`Échec de l'import des résultats : ${error.message}`);
  }
}