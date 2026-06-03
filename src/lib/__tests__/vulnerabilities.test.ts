import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { assignVulnerability, markAsCorrected, validateFix } from '@/actions/vulnerabilityActions';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    vulnerabilite: { findUnique: vi.fn(), update: vi.fn() },
    historiqueVulnerabilite: { create: vi.fn() },
    planCorrection: { update: vi.fn(), create: vi.fn() },
  }
}));

// Mock NextAuth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(() => ({ user: { id: 'user-123' } }))
}));

describe('Vulnerability Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should assign vulnerability and create plan', async () => {
    const data = {
      vulnerabiliteId: 'vuln-123',
      assigneA: 'user-456',
      priorite: 'HAUTE',
    };

    await assignVulnerability({
    ...data,
    priorite: data.priorite as "BASSE" | "MOYENNE" | "HAUTE" | "CRITIQUE"
    });


    expect(prisma.vulnerabilite.update).toHaveBeenCalled();
    expect(prisma.historiqueVulnerabilite.create).toHaveBeenCalled();
  });

  it('should mark as corrected', async () => {
    const data = {
      vulnerabiliteId: 'vuln-123',
      preuve: 'Capture d’écran',
    };

    await markAsCorrected(data);

    expect(prisma.vulnerabilite.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ statut: 'CORRIGEE' })
      })
    );
  });
});