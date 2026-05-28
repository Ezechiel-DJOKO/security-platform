import { scanRepository } from './repository';
import { prisma } from '@/lib/prisma';
import { ScanInput, VulnerabiliteInput } from './types';
import { runNucleiScan } from '@/lib/scanner/nuclei';

export const scanService = {
  async lancerScan(input: ScanInput) {
    const scan = await scanRepository.createScan({
      idActif: input.idActif,
      lancerPar: input.userId,
      type: input.type,
      outil: input.outil,
      statut: 'EN_COURS',
      debut: new Date(),
      metadata: { cible: input.cible },
    });

    console.log(`🔄 Scan lancé (ID: ${scan.id})`);

    // Simulation ou appel réel selon l'outil
    if (input.outil === 'NUCLEI' && input.cible) {
      const nucleiResult = await runNucleiScan(input.cible);

      if (nucleiResult.success) {
        // Conversion des résultats Nuclei en format Vulnerabilite
        const vulnerabilites: VulnerabiliteInput[] = nucleiResult.results.map((r: any) => ({
          titre: r.name || r.template || "Vulnérabilité détectée",
          description: r.description || "",
          severite: mapSeverity(r.severity),
          scoreCVSS: r.cvss_score || null,
          cveId: r.cve_id || null,
          recommandation: r.remediation || "",
        }));

        await scanRepository.createVulnerabilites(scan.id, vulnerabilites);

        await prisma.scan.update({
          where: { id: scan.id },
          data: { 
            statut: 'TERMINE', 
            fin: new Date(),
            duree: 60 
          }
        });
      }
    }

    return scan;
  }
};

// Fonction utilitaire pour mapper la sévérité
function mapSeverity(severity: string): any {
  const map: any = {
    'critical': 'CRITICAL',
    'high': 'HIGH',
    'medium': 'MEDIUM',
    'low': 'LOW'
  };
  return map[severity?.toLowerCase()] || 'MEDIUM';
}
