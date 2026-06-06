// src/lib/__tests__/setup.ts
import { vi } from 'vitest';

// Mock Prisma au niveau top-level (recommandé par Vitest)
vi.mock('@/lib/prisma', () => ({
  prisma: {
    controlConformite: {
      findMany: vi.fn(),
    },
    $disconnect: vi.fn().mockResolvedValue(undefined),
  },
}));