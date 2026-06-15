// seed.ts (à la racine)
import "dotenv/config";
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import crypto from 'crypto';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function hashPassword(password: string): string {
  // Utilisation directe du module importé 'crypto'
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function main() {
  console.log("🌱 Seeding...");

  const password = hashPassword("password123");

  await Promise.all([
    prisma.utilisateur.upsert({
      where: { email: "admin@test.com" },
      update: { motDePasseHashe: password },
      create: {
        nom: "Admin",
        prenom: "Super",
        email: "admin@test.com",
        motDePasseHashe: password,
        role: "ADMIN",
        actif: true,
      }
    }),
    prisma.utilisateur.upsert({
      where: { email: "auditeur@test.com" },
      update: { motDePasseHashe: password },
      create: {
        nom: "Auditeur",
        prenom: "Jean",
        email: "auditeur@test.com",
        motDePasseHashe: password,
        role: "AUDITEUR",
        actif: true,
      }
    }),
    prisma.utilisateur.upsert({
      where: { email: "superviseur@test.com" },
      update: { motDePasseHashe: password },
      create: {
        nom: "Superviseur",
        prenom: "Marie",
        email: "superviseur@test.com",
        motDePasseHashe: password,
        role: "SUPERVISEUR",
        actif: true,
      }
    }),
  ]);

  console.log("✅ Utilisateurs créés");
  console.log("→ admin@test.com / auditeur@test.com / superviseur@test.com (password: password123)");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
