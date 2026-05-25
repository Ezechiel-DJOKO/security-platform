import { PrismaClient } from "@prisma/client/index";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const { Pool } = pg;

// Typage strict de l'objet global pour Next.js (évite les fuites de connexions en Dev)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: pg.Pool | undefined;
};

// 1. Initialisation unique du Pool de connexion PostgreSQL
const pool = 
  globalForPrisma.pool ?? 
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: process.env.NODE_ENV === "production" ? 20 : 5, // Limite le pool en Dev pour économiser la BDD
    idleTimeoutMillis: 30000, // Ferme les connexions inactives après 30s
    connectionTimeoutMillis: 2000, // Timeout rapide en cas de coupure réseau
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.pool = pool;
}

// 2. Création de l'adaptateur Prisma officiel pour pg
const adapter = new PrismaPg(pool);

// 3. Instance unique du Prisma Client avec l'adaptateur et gestion des logs
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
