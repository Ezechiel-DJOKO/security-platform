import { scanRepository } from './repository';
import { prisma } from '@/lib/prisma';
import { ScanInput, VulnerabiliteInput } from './types';
import { runNucleiScan } from '@/lib/scanner/nuclei';

// ── Interfaces pour les résultats Nuclei ─────────────────────────────

interface NucleiResult {
  success: boolean;
  results: NucleiVulnerability[];
}

interface NucleiVulnerability {
  name?: string;
  template?: string;
  description?: string;
  severity?: string;
  cvss_score?: number | null;
  cve_id?: string | null;
  remediation?: string;
}

// ── Type local pour la sévérité (si Prisma enum pas exporté) ───────

type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

// ── Service ─────────────────────────────────────────────────────────

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

    if (input.outil === 'NUCLEI' && input.cible) {
      const nucleiResult: NucleiResult = await runNucleiScan(input.cible);

      if (nucleiResult.success) {
        const vulnerabilites: VulnerabiliteInput[] = nucleiResult.results.map((r) => ({
          titre: r.name || r.template || 'Vulnérabilité détectée',
          description: r.description || '',
          severite: mapSeverity(r.severity),
          scoreCVSS: r.cvss_score ?? undefined,
          cveId: r.cve_id ?? undefined,
          recommandation: r.remediation || '',
        }));

        await scanRepository.createVulnerabilites(scan.id, vulnerabilites);

        await prisma.scan.update({
          where: { id: scan.id },
          data: {
            statut: 'TERMINE',
            fin: new Date(),
            duree: 60,
          },
        });
      }
    }

    return scan;
  },
};

// ── Fonction utilitaire ───────────────────────────────────────────────

const SEVERITY_MAP: Record<string, SeverityLevel> = {
  critical: 'CRITICAL',
  high: 'HIGH',
  medium: 'MEDIUM',
  low: 'LOW',
};

function mapSeverity(severity: string | undefined): SeverityLevel {
  if (!severity) return 'MEDIUM';
  return SEVERITY_MAP[severity.toLowerCase()] ?? 'MEDIUM';
}