// seed.ts - Version propre (seulement utilisateurs + ISO)
import "dotenv/config";
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(32).toString('hex');
    crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (err, derivedKey) => {
      if (err) reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

async function main() {
  console.log("🌱 Seeding léger (Utilisateurs + ISO 27001)...");

  const password = "password123";
  const hashedPassword = await hashPassword(password);

  // Utilisateurs
  await Promise.all([
    prisma.utilisateur.upsert({
      where: { email: "admin@test.com" },
      update: {},
      create: { nom: "Admin", prenom: "Super", email: "admin@test.com", motDePasseHashe: hashedPassword, role: "ADMIN", actif: true }
    }),
    prisma.utilisateur.upsert({
      where: { email: "auditeur@test.com" },
      update: {},
      create: { nom: "Koné", prenom: "Jean", email: "auditeur@test.com", motDePasseHashe: hashedPassword, role: "AUDITEUR", actif: true }
    }),
    prisma.utilisateur.upsert({
      where: { email: "superviseur@test.com" },
      update: {},
      create: { nom: "Dupont", prenom: "Marie", email: "superviseur@test.com", motDePasseHashe: hashedPassword, role: "SUPERVISEUR", actif: true }
    }),
  ]);

  console.log("✅ Utilisateurs créés avec succès");
  console.log("→ admin@test.com / auditeur@test.com / superviseur@test.com (password: password123)");
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
