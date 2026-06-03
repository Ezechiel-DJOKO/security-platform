import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// 1. Initialiser le pool natif de votre base de données PostgreSQL
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// 2. Créer l'adaptateur Driver requis par Prisma 7
const adapter = new PrismaPg(pool);

// 3. Injecter l'adaptateur dans le constructeur
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  adapter, // <-- Indispensable pour éliminer l'erreur de configuration vide
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
