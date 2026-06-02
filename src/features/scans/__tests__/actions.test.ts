import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vulnerabilityActions from '@/actions/vulnerabilityActions';
import { scanService } from '../service';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { TypeScan, OutilScan } from '@prisma/client';

// 1. Mock complet des dépendances applicatives
vi.mock('../service', () => ({
  scanService: { lancerScan: vi.fn() }
}));

vi.mock('next-auth', () => ({
  getServerSession: vi.fn()
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}));

// 2. Mock de Prisma pour intercepter les requêtes en base de données
vi.mock('@/lib/prisma', () => ({
  prisma: {
    vulnerabilite: {
      findUnique: vi.fn(),
      update: vi.fn(() => Promise.resolve({})) // Retourne une promesse pour le workflow
    },
    planCorrection: {
      create: vi.fn(() => Promise.resolve({})),
      // L'ajout de Promise.resolve({}) permet au .catch() du code source de fonctionner
      update: vi.fn(() => Promise.resolve({})) 
    },
    historiqueVulnerabilite: {
      create: vi.fn(() => Promise.resolve({}))
    }
  }
}));


describe('Vulnerability & Scanner Workflow - Full Coverage', () => {
  const mockUserId = 'user-security-1';
  const mockVulnId = '301f2f84-9844-42f2-959d-6eb1b18fa900'; // UUID valide pour Zod
  const mockAgentId = '401f2f84-9844-42f2-959d-6eb1b18fa900'; // UUID valide pour Zod

  beforeEach(() => {
    vi.clearAllMocks();
    // Par défaut, l'utilisateur possède une session active
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: mockUserId } } as any);
  });

  // ==========================================
  // LOGIQUE DU MODULE SCANNER (Déjà validée)
  // ==========================================
  describe('lancerNouveauScan()', () => {
    it('devrait lancer un scan avec succès si l’utilisateur est authentifié', async () => {
      const mockScan = { id: 'scan-123', statut: 'EN_COURS' };
      vi.mocked(scanService.lancerScan).mockResolvedValue(mockScan as any);

      const input = {
        idActif: 'actif-123',
        type: 'VULNERABILITE' as TypeScan,
        outil: 'NUCLEI' as OutilScan,
        cible: 'https://example.com'
      };

      const result = await vulnerabilityActions.lancerNouveauScan(input);
      expect(result.success).toBe(true);
      expect(scanService.lancerScan).toHaveBeenCalledWith({ ...input, userId: mockUserId });
    });

    it('devrait retourner un échec si l’utilisateur n’est pas authentifié', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);
      const result = await vulnerabilityActions.lancerNouveauScan({
        idActif: 'actif-123',
        type: 'VULNERABILITE' as TypeScan,
        outil: 'NUCLEI' as OutilScan,
        cible: 'https://test.com'
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe('Non authentifié');
    });
  });

  // ==========================================
  // NOUVEAU : TESTS POUR assignVulnerability()
  // ==========================================
  describe('assignVulnerability()', () => {
    const defaultPayload = {
      vulnerabiliteId: mockVulnId,
      assigneA: mockAgentId,
      priorite: 'HAUTE' as const,
      commentaire: 'Veuillez corriger cette faille rapidement.'
    };

    it('devrait assigner la vulnérabilité et créer un plan de correction s’il n’existe pas', async () => {
      // Simulation : La vulnérabilité existe mais n'a pas encore de plan
      vi.mocked(prisma.vulnerabilite.findUnique).mockResolvedValue({
        id: mockVulnId,
        statut: 'OUVERTE',
        plan: null
      } as any);
      vi.mocked(prisma.vulnerabilite.update).mockResolvedValue({ id: mockVulnId } as any);

      const result = await vulnerabilityActions.assignVulnerability(defaultPayload);

      expect(result.success).toBe(true);
      expect(prisma.vulnerabilite.update).toHaveBeenCalledWith({
        where: { id: mockVulnId },
        data: { assigneA: mockAgentId, statut: 'EN_COURS' }
      });
      expect(prisma.planCorrection.create).toHaveBeenCalled();
      expect(prisma.historiqueVulnerabilite.create).toHaveBeenCalled();
    });

    it('devrait mettre à jour le plan de correction s’il existe déjà', async () => {
      // Simulation : La vulnérabilité existe et possède déjà un plan
      vi.mocked(prisma.vulnerabilite.findUnique).mockResolvedValue({
        id: mockVulnId,
        statut: 'OUVERTE',
        plan: { id: 'plan-existant' }
      } as any);

      await vulnerabilityActions.assignVulnerability(defaultPayload);

      expect(prisma.planCorrection.update).toHaveBeenCalledWith({
        where: { idVulnerabilite: mockVulnId },
        data: expect.objectContaining({ statut: 'A_FAIRE', assigneA: mockAgentId })
      });
    });

    it('devrait échouer si la vulnérabilité est introuvable', async () => {
      vi.mocked(prisma.vulnerabilite.findUnique).mockResolvedValue(null);
      await expect(vulnerabilityActions.assignVulnerability(defaultPayload)).rejects.toThrow('Vulnérabilité non trouvée');
    });
  });

  // ==========================================
  // NOUVEAU : TESTS POUR markAsCorrected()
  // ==========================================
  describe('markAsCorrected()', () => {
    const payload = {
      vulnerabiliteId: mockVulnId,
      preuve: 'https://github.com',
      commentaire: 'Fermeture du port SSH non sécurisé.'
    };

    it('devrait passer le statut à CORRIGEE et clore le plan associé', async () => {
      vi.mocked(prisma.vulnerabilite.findUnique).mockResolvedValue({ id: mockVulnId, statut: 'EN_COURS' } as any);
      vi.mocked(prisma.vulnerabilite.update).mockResolvedValue({ id: mockVulnId } as any);

      const result = await vulnerabilityActions.markAsCorrected(payload);

      expect(result.success).toBe(true);
      expect(prisma.vulnerabilite.update).toHaveBeenCalledWith({
        where: { id: mockVulnId },
        data: expect.objectContaining({ statut: 'CORRIGEE', preuve: payload.preuve })
      });
      expect(prisma.planCorrection.update).toHaveBeenCalledWith({
        where: { idVulnerabilite: mockVulnId },
        data: expect.objectContaining({ statut: 'TERMINE' })
      });
    });
  });

  // ==========================================
  // NOUVEAU : TESTS POUR validateFix()
  // ==========================================
  describe('validateFix()', () => {
    it('devrait clore définitivement le ticket à l’état VERIFIEE', async () => {
      vi.mocked(prisma.vulnerabilite.findUnique).mockResolvedValue({ id: mockVulnId, statut: 'CORRIGEE' } as any);
      vi.mocked(prisma.vulnerabilite.update).mockResolvedValue({ id: mockVulnId } as any);

      const result = await vulnerabilityActions.validateFix({
        vulnerabiliteId: mockVulnId,
        commentaire: 'Validation après contre-audit Nuclei.'
      });

      expect(result.success).toBe(true);
      expect(prisma.vulnerabilite.update).toHaveBeenCalledWith({
        where: { id: mockVulnId },
        data: { statut: 'VERIFIEE' }
      });
      expect(prisma.planCorrection.update).toHaveBeenCalledWith({
        where: { idVulnerabilite: mockVulnId },
        data: { statut: 'VERIFIE' }
      });
    });
  });
});
