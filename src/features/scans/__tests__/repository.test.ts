import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { scanRepository } from '../repository';
import { prisma } from '@/lib/prisma';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    scan: {
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    vulnerabilite: {
      createMany: vi.fn(),
    },
    actif: {
      update: vi.fn(),
    },
  },
}));

describe('Scan Repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createScan()', () => {
    it('devrait créer un scan avec les bonnes relations', async () => {
      const mockData = {
        idActif: 'actif-123',
        lancerPar: 'user-1',
        type: 'VULNERABILITE',
        outil: 'NUCLEI',
        statut: 'EN_COURS',
      };

      const mockScan = { id: 'scan-uuid-123', ...mockData };

      (prisma.scan.create as Mock).mockResolvedValue(mockScan);

      const result = await scanRepository.createScan(mockData);

      expect(result).toEqual(mockScan);
      expect(prisma.scan.create).toHaveBeenCalledWith({
        data: mockData,
        include: { actif: true, utilisateur: true }
      });
    });
  });

  describe('createVulnerabilites()', () => {
    it('devrait créer plusieurs vulnérabilités associées à un scan', async () => {
      const vulnerabilites = [
        { titre: "XSS", description: "Cross Site Scripting", severite: "HIGH" },
        { titre: "SQLi", description: "Injection SQL", severite: "CRITICAL" },
      ];

      (prisma.vulnerabilite.createMany as Mock).mockResolvedValue({ count: 2 });

      const result = await scanRepository.createVulnerabilites('scan-123', vulnerabilites);

      expect(result).toEqual({ count: 2 });
      expect(prisma.vulnerabilite.createMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('getScans()', () => {
    it('devrait retourner la liste des scans avec inclusions', async () => {
      const mockScans = [{ id: '1' }, { id: '2' }];
      (prisma.scan.findMany as Mock).mockResolvedValue(mockScans);

      const result = await scanRepository.getScans();

      expect(result).toEqual(mockScans);
      expect(prisma.scan.findMany).toHaveBeenCalledWith({
        include: { actif: true, vulnerabilites: true },
        orderBy: { createdAt: 'desc' }
      });
    });
  });
});