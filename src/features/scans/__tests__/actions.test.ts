import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vulnerabilityActions from '@/actions/vulnerabilityActions';
import { scanService } from '../service';
import { getServerSession } from "next-auth/next";
import { prisma } from '@/lib/prisma';
import { TypeScan, OutilScan, Prisma } from '@prisma/client';

// ── Types Prisma générés ─────────────────────────────────────────────


type Vulnerabilite = Prisma.VulnerabiliteGetPayload<{
  include: { plan: true };
}>;

type ScanWithRelations = Prisma.ScanGetPayload<{
  include: { utilisateur: true; actif: true };
}>;


// ── Helpers pour créer des mocks partiels qui satisfont Prisma ────────

function createMockScan(
  overrides: Partial<ScanWithRelations> = {}
): ScanWithRelations {
  return {
    id: 'scan-123',
    statut: 'EN_COURS',
    idActif: 'actif-123',
    lancerPar: 'user-1',
    type: 'VULNERABILITE' as TypeScan,
    outil: 'NUCLEI' as OutilScan,
    debut: new Date(),
    fin: null,
    duree: null,
    resultats: null,
    metadata: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    // ↓↓↓ AJOUTE CES RELATIONS ↓↓↓
    utilisateur: {
      id: 'user-1',
      nom: 'Doe',
      prenom: 'John',
      email: 'john@example.com',
      motDePasseHashe: 'hashed',
      role: 'ADMIN' as const, // ou 'ANALYSTE', 'AGENT' selon ton enum RoleUtilisateur
      actif: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
    actif: {
      id: 'actif-123',
      nom: 'Serveur Test',
      type: 'SERVEUR' as const, // adapte selon ton enum TypeActif
      adresseIP: '192.168.1.1',
      statut: 'ACTIF' as const, // adapte selon ton enum StatutActif
      description: null,
      environnement: 'PRODUCTION' as const,
      criticite: 'HAUTE' as const,
      responsableId: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
    ...overrides,
  } as ScanWithRelations;
}

function createMockVuln(
  overrides: Partial<Vulnerabilite> = {}
): Vulnerabilite {
  return {
    id: 'vuln-123',
    titre: 'Titre',
    description: null,
    severite: 'MEDIUM',
    scoreCVSS: null,
    cveId: null,
    statut: 'OUVERTE',
    idScan: 'scan-123',
    assigneA: null,
    preuve: null,
    dateCorrection: null,
    plan: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Vulnerabilite;
}

// ── Mocks ─────────────────────────────────────────────────────────────

vi.mock('../service', () => ({
  scanService: { lancerScan: vi.fn() },
}));

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    vulnerabilite: {
      findUnique: vi.fn(),
      update: vi.fn(() => Promise.resolve({})),
    },
    planCorrection: {
      create: vi.fn(() => Promise.resolve({})),
      update: vi.fn(() => Promise.resolve({})),
    },
    historiqueVulnerabilite: {
      create: vi.fn(() => Promise.resolve({})),
    },
  },
}));

describe('Vulnerability & Scanner Workflow - Full Coverage', () => {
  const mockUserId = 'user-security-1';
  const mockVulnId = '301f2f84-9844-42f2-959d-6eb1b18fa900';
  const mockAgentId = '401f2f84-9844-42f2-959d-6eb1b18fa900';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId },
    } as { user: { id: string } });
  });

  // ==========================================
  // SCANNER
  // ==========================================
  describe('lancerNouveauScan()', () => {
    it('devrait lancer un scan avec succès', async () => {
      const mockScan = createMockScan({ id: 'scan-123' });
      vi.mocked(scanService.lancerScan).mockResolvedValue(mockScan);

      const input = {
        idActif: 'actif-123',
        type: 'VULNERABILITE' as TypeScan,
        outil: 'NUCLEI' as OutilScan,
        cible: 'https://example.com',
      };

      const result = await vulnerabilityActions.lancerNouveauScan(input);
      expect(result.success).toBe(true);
      expect(scanService.lancerScan).toHaveBeenCalledWith({
        ...input,
        userId: mockUserId,
      });
    });

    it('devrait retourner un échec si non authentifié', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);
      const result = await vulnerabilityActions.lancerNouveauScan({
        idActif: 'actif-123',
        type: 'VULNERABILITE' as TypeScan,
        outil: 'NUCLEI' as OutilScan,
        cible: 'https://test.com',
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe('Non authentifié');
    });
  });

  // ==========================================
  // ASSIGN
  // ==========================================
  describe('assignVulnerability()', () => {
    const defaultPayload = {
      vulnerabiliteId: mockVulnId,
      assigneA: mockAgentId,
      priorite: 'HAUTE' as const,
      commentaire: 'Veuillez corriger cette faille rapidement.',
    };

    it('devrait assigner et créer un plan', async () => {
      const mockVuln = createMockVuln({
        id: mockVulnId,
        statut: 'OUVERTE',
        plan: null,
      });
      vi.mocked(prisma.vulnerabilite.findUnique).mockResolvedValue(mockVuln);
      vi.mocked(prisma.vulnerabilite.update).mockResolvedValue(
        createMockVuln({ id: mockVulnId })
      );

      const result = await vulnerabilityActions.assignVulnerability(defaultPayload);

      expect(result.success).toBe(true);
      expect(prisma.vulnerabilite.update).toHaveBeenCalledWith({
        where: { id: mockVulnId },
        data: { assigneA: mockAgentId, statut: 'EN_COURS' },
      });
      expect(prisma.planCorrection.create).toHaveBeenCalled();
      expect(prisma.historiqueVulnerabilite.create).toHaveBeenCalled();
    });

    it('devrait mettre à jour le plan existant', async () => {
      // Dans le test "devrait mettre à jour le plan existant"
    const mockVuln = createMockVuln({
      id: mockVulnId,
      statut: 'OUVERTE',
      plan: {
        id: 'plan-existant',
        idVulnerabilite: mockVulnId,  // ← clé étrangère
        assigneA: 'user-1',
        priorite: 'MOYENNE',
        dateEcheance: new Date(),
        statut: 'A_FAIRE',
        commentaire: '',
        dateResolution: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        // PAS de 'vulnerabilite' ici !
        // PAS de 'assigne' ici non plus (relation inverse) !
      },
    });
      vi.mocked(prisma.vulnerabilite.findUnique).mockResolvedValue(mockVuln);

      await vulnerabilityActions.assignVulnerability(defaultPayload);

      expect(prisma.planCorrection.update).toHaveBeenCalledWith({
        where: { idVulnerabilite: mockVulnId },
        data: expect.objectContaining({
          statut: 'A_FAIRE',
          assigneA: mockAgentId,
        }),
      });
    });

    it('devrait échouer si introuvable', async () => {
      vi.mocked(prisma.vulnerabilite.findUnique).mockResolvedValue(null);
      await expect(
        vulnerabilityActions.assignVulnerability(defaultPayload)
      ).rejects.toThrow('Vulnérabilité non trouvée');
    });
  });

  // ==========================================
  // MARK AS CORRECTED
  // ==========================================
  describe('markAsCorrected()', () => {
    const payload = {
      vulnerabiliteId: mockVulnId,
      preuve: 'https://github.com',
      commentaire: 'Fermeture du port SSH non sécurisé.',
    };

    it('devrait passer à CORRIGEE', async () => {
      const mockVuln = createMockVuln({
        id: mockVulnId,
        statut: 'EN_COURS',
      });
      vi.mocked(prisma.vulnerabilite.findUnique).mockResolvedValue(mockVuln);
      vi.mocked(prisma.vulnerabilite.update).mockResolvedValue(
        createMockVuln({ id: mockVulnId })
      );

      const result = await vulnerabilityActions.markAsCorrected(payload);

      expect(result.success).toBe(true);
      expect(prisma.vulnerabilite.update).toHaveBeenCalledWith({
        where: { id: mockVulnId },
        data: expect.objectContaining({
          statut: 'CORRIGEE',
          preuve: payload.preuve,
        }),
      });
      expect(prisma.planCorrection.update).toHaveBeenCalledWith({
        where: { idVulnerabilite: mockVulnId },
        data: expect.objectContaining({ statut: 'TERMINE' }),
      });
    });
  });

  // ==========================================
  // VALIDATE FIX
  // ==========================================
  describe('validateFix()', () => {
    it('devrait clore à VERIFIEE', async () => {
      const mockVuln = createMockVuln({
        id: mockVulnId,
        statut: 'CORRIGEE',
      });
      vi.mocked(prisma.vulnerabilite.findUnique).mockResolvedValue(mockVuln);
      vi.mocked(prisma.vulnerabilite.update).mockResolvedValue(
        createMockVuln({ id: mockVulnId })
      );

      const result = await vulnerabilityActions.validateFix({
        vulnerabiliteId: mockVulnId,
        commentaire: 'Validation après contre-audit Nuclei.',
      });

      expect(result.success).toBe(true);
      expect(prisma.vulnerabilite.update).toHaveBeenCalledWith({
        where: { id: mockVulnId },
        data: { statut: 'VERIFIEE' },
      });
      expect(prisma.planCorrection.update).toHaveBeenCalledWith({
        where: { idVulnerabilite: mockVulnId },
        data: { statut: 'VERIFIE' },
      });
    });
  });
});