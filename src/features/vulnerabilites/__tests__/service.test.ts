// src/features/vulnerabilites/__tests__/service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { vulnerabiliteService } from './service';
import { vulnerabiliteRepository } from '../repository';
import { StatutVulnerabilite, Priorite } from '@prisma/client';

// Mocks
vi.mock('../repository', () => ({
  vulnerabiliteRepository: {
    createMany: vi.fn(),
    updateStatut: vi.fn(),
    assigner: vi.fn(),
    getByScan: vi.fn(),
  }
}));

describe('Vulnerabilite Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('creerVulnerabilites()', () => {
    it('devrait créer plusieurs vulnérabilités à partir des résultats', async () => {
      const mockResults = [
        { titre: 'XSS', scoreCVSS: 8.5, description: '...' },
        { titre: 'SQL Injection', scoreCVSS: 9.8, description: '...' }
      ];

      (vulnerabiliteRepository.createMany as any).mockResolvedValue({ count: 2 });

      const result = await vulnerabiliteService.creerVulnerabilites('scan-123', mockResults);

      expect(result.count).toBe(2);
      expect(vulnerabiliteRepository.createMany).toHaveBeenCalledTimes(1);
    });

    it('devrait retourner count 0 si aucun résultat', async () => {
      const result = await vulnerabiliteService.creerVulnerabilites('scan-123', []);
      expect(result.count).toBe(0);
    });
  });

  describe('mettreAJourStatut()', () => {
    it('devrait mettre à jour le statut et logger l’historique', async () => {
      const mockUpdated = { id: 'vuln-1', statut: 'CORRIGEE' };
      (vulnerabiliteRepository.updateStatut as any).mockResolvedValue(mockUpdated);

      const result = await vulnerabiliteService.mettreAJourStatut(
        'vuln-1',
        'CORRIGEE',
        'user-456',
        'Corrigé via patch'
      );

      expect(result).toEqual(mockUpdated);
      expect(vulnerabiliteRepository.updateStatut).toHaveBeenCalledWith(
        'vuln-1', 'CORRIGEE', 'user-456', 'Corrigé via patch'
      );
    });
  });

  describe('assignerVulnerabilite()', () => {
    it('devrait assigner une vulnérabilité avec priorité', async () => {
      const mockResult = { vulnerabilite: {}, planCorrection: {} };
      (vulnerabiliteRepository.assigner as any).mockResolvedValue(mockResult);

      const result = await vulnerabiliteService.assignerVulnerabilite('vuln-1', 'user-789', 'HAUTE');

      expect(result).toEqual(mockResult);
      expect(vulnerabiliteRepository.assigner).toHaveBeenCalledWith('vuln-1', 'user-789', 'HAUTE');
    });
  });
});