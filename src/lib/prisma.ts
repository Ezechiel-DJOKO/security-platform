// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    // 💡 Force Prisma 7 à utiliser le moteur Node.js classique sous Turbopack
    engineType: 'library', 
  } as any); // Le "as any" évite un conflit de types strict temporaire

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
