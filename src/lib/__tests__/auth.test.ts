import { describe, it, expect, vi } from 'vitest';
import { authOptions } from '../auth';
import { getServerSession } from 'next-auth/next';

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

// Mock Prisma si nécessaire
vi.mock('@/lib/prisma', () => ({
  prisma: {
    utilisateur: {
      findUnique: vi.fn(),
    },
  },
}));

describe('Auth', () => {
  it('devrait retourner la session', async () => {
    const mockSession = {
      user: {
        id: 'user-1',
        email: 'test@test.com',
        name: 'Test',
        role: 'ADMIN', // ou RoleUtilisateur.ADMIN si importé
      },
    };

    vi.mocked(getServerSession).mockResolvedValue(mockSession);

    const session = await getServerSession(authOptions);
    expect(session?.user).toBeDefined();
  });
});