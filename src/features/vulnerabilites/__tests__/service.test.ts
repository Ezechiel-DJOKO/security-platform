// src/features/vulnerabilites/__tests__/service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { vulnerabiliteService } from './service';
import { vulnerabiliteRepository } from '../repository';

// Types pour les mocks
type MockedRepository = {
  createMany: ReturnType<typeof vi.fn>;
  updateStatut: ReturnType<typeof vi.fn>;
  assigner: ReturnType<typeof vi.fn>;
  getByScan: ReturnType<typeof vi.fn>;
};

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
  const mockedRepo = vulnerabiliteRepository as unknown as MockedRepository;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('creerVulnerabilites()', () => {
    it('devrait créer plusieurs vulnérabilités à partir des résultats', async () => {
      const mockResults = [
        { titre: 'XSS', scoreCVSS: 8.5, description: '...' },
        { titre: 'SQL Injection', scoreCVSS: 9.8, description: '...' }
      ];

      mockedRepo.createMany.mockResolvedValue({ count: 2 });

      const result = await vulnerabiliteService.creerVulnerabilites('scan-123', mockResults);

      expect(result.count).toBe(2);
      expect(mockedRepo.createMany).toHaveBeenCalledTimes(1);
    });

    it('devrait retourner count 0 si aucun résultat', async () => {
      const result = await vulnerabiliteService.creerVulnerabilites('scan-123', []);
      expect(result.count).toBe(0);
    });
  });

  describe('mettreAJourStatut()', () => {
    it('devrait mettre à jour le statut et logger l\'historique', async () => {
      const mockUpdated = { id: 'vuln-1', statut: 'CORRIGEE' };
      mockedRepo.updateStatut.mockResolvedValue(mockUpdated);

      const result = await vulnerabiliteService.mettreAJourStatut(
        'vuln-1',
        'CORRIGEE' as const,
        'user-456',
        'Corrigé via patch'
      );

      expect(result).toEqual(mockUpdated);
      expect(mockedRepo.updateStatut).toHaveBeenCalledWith(
        'vuln-1', 'CORRIGEE', 'user-456', 'Corrigé via patch'
      );
    });
  });

  describe('assignerVulnerabilite()', () => {
    it('devrait assigner une vulnérabilité avec priorité', async () => {
      const mockResult = { vulnerabilite: {}, planCorrection: {} };
      mockedRepo.assigner.mockResolvedValue(mockResult);

      const result = await vulnerabiliteService.assignerVulnerabilite(
        'vuln-1',
        'user-789',
        'HAUTE' as const
      );

      expect(result).toEqual(mockResult);
      expect(mockedRepo.assigner).toHaveBeenCalledWith('vuln-1', 'user-789', 'HAUTE');
    });
  });
});