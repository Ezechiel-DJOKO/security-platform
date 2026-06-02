import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scanService } from '../service';
import { scanRepository } from '../repository';
import * as nucleiScanner from '@/lib/scanner/nuclei';
import { prisma } from '@/lib/prisma';
import { ScanInput } from '../types';

// Mocks
vi.mock('../repository', () => ({
  scanRepository: {
    createScan: vi.fn(),
    createVulnerabilites: vi.fn(),
    updateActifLastScan: vi.fn(),
    getScans: vi.fn(),
  }
}));

vi.mock('@/lib/scanner/nuclei', () => ({
  runNucleiScan: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    scan: {
      update: vi.fn().mockResolvedValue({}),
    },
  },
}));

describe('Scan Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('lancerScan()', () => {
    it('devrait créer un scan et le lancer avec succès', async () => {
      const mockInput: ScanInput = {
        idActif: 'actif-123',
        userId: 'user-1',
        type: 'VULNERABILITE',
        outil: 'NUCLEI',
        cible: 'https://example.com',
      };

      const mockScan = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        idActif: 'actif-123',
        statut: 'EN_COURS',
      };

      (scanRepository.createScan as any).mockResolvedValue(mockScan);
      (nucleiScanner.runNucleiScan as any).mockResolvedValue({
        success: true,
        results: []
      });

      const result = await scanService.lancerScan(mockInput);

      expect(result).toEqual(mockScan);
      expect(scanRepository.createScan).toHaveBeenCalledTimes(1);
      expect(scanRepository.createVulnerabilites).toHaveBeenCalledTimes(1); // Changé à 1 (même avec tableau vide)
    });

    it('devrait créer les vulnérabilités si des résultats sont trouvés', async () => {
      const mockInput: ScanInput = {
        idActif: 'actif-123',
        userId: 'user-1',
        type: 'VULNERABILITE',
        outil: 'NUCLEI',
        cible: 'https://example.com',
      };

      const mockScan = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        statut: 'EN_COURS',
      };

      (scanRepository.createScan as any).mockResolvedValue(mockScan);
      (nucleiScanner.runNucleiScan as any).mockResolvedValue({
        success: true,
        results: [{ name: "Test Vuln", severity: "high" }]
      });

      const result = await scanService.lancerScan(mockInput);

      expect(result).toEqual(mockScan);
      expect(scanRepository.createVulnerabilites).toHaveBeenCalledTimes(1);
    });

    it('devrait gérer le cas où le scan Nuclei échoue', async () => {
      const mockInput: ScanInput = {
        idActif: 'actif-123',
        userId: 'user-1',
        type: 'VULNERABILITE',
        outil: 'NUCLEI',
        cible: 'https://example.com',
      };

      const mockScan = {
        id: '550e8400-e29b-41d4-a716-446655440002',
        statut: 'EN_COURS',
      };

      (scanRepository.createScan as any).mockResolvedValue(mockScan);
      (nucleiScanner.runNucleiScan as any).mockResolvedValue({ success: false });

      const result = await scanService.lancerScan(mockInput);

      expect(result).toEqual(mockScan);
      expect(scanRepository.createVulnerabilites).toHaveBeenCalledTimes(0);
    });
  });
});