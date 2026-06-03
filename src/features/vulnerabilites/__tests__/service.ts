// src/features/vulnerabilites/service.ts
import { vulnerabiliteRepository } from '../repository';
import { StatutVulnerabilite, Priorite, Severite } from '@prisma/client';

// ─── Types ───────────────────────────────────────────────

interface ResultatScan {
  cveId?: string;
  titre?: string;
  name?: string;
  description?: string;
  severite?: Severite;
  scoreCVSS?: number;
  vecteurCVSS?: string;
  preuve?: string;
  matchedAt?: string;
  recommandation?: string;
}

// ─── Service ─────────────────────────────────────────────

export const vulnerabiliteService = {

  async creerVulnerabilites(scanId: string, resultats: ResultatScan[]) {
    if (!resultats || resultats.length === 0) return { count: 0 };

    const vulnerabilites = resultats.map(v => ({
      idScan: scanId,
      cveId: v.cveId || null,
      titre: v.titre || v.name || 'Vulnérabilité détectée',
      description: v.description,
      severite: v.severite || this.determinerSeverite(v.scoreCVSS),
      scoreCVSS: v.scoreCVSS || null,
      vecteurCVSS: v.vecteurCVSS || null,
      preuve: v.preuve || v.matchedAt || null,
      recommandation: v.recommandation,
    }));

    return vulnerabiliteRepository.createMany(vulnerabilites);
  },

  async mettreAJourStatut(
    idVuln: string,
    nouveauStatut: StatutVulnerabilite,
    userId: string,
    commentaire?: string
  ) {
    return vulnerabiliteRepository.updateStatut(idVuln, nouveauStatut, userId, commentaire);
  },

  async assignerVulnerabilite(
    idVuln: string,
    userId: string,
    priorite: Priorite = 'MOYENNE'
  ) {
    return vulnerabiliteRepository.assigner(idVuln, userId, priorite);
  },

  async getVulnerabilitesByScan(scanId: string) {
    return vulnerabiliteRepository.getByScan(scanId);
  },

  determinerSeverite(score?: number): Severite {
    if (!score) return 'MEDIUM';
    if (score >= 9.0) return 'CRITICAL';
    if (score >= 7.0) return 'HIGH';
    if (score >= 4.0) return 'MEDIUM';
    return 'LOW';
  }
};