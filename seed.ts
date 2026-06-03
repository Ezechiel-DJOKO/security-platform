// seed.ts
import "dotenv/config";
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import crypto from 'crypto';
import type { ScryptOptions } from 'crypto';  

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(32).toString('hex');
    
    crypto.scrypt(password, salt, 64, { 
      N: 16384, 
      r: 8, 
      p: 1 
    } as ScryptOptions, (err: Error | null, derivedKey: Buffer) => {
      if (err) reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

async function main() {
  console.log("🌱 Début du seeding complet...");

  const hashedPassword = await hashPassword("test123");

  // ==================== 1. UTILISATEURS ====================
  const users = await Promise.all([
    prisma.utilisateur.upsert({ where: { email: "admin@test.com" }, update: {}, create: { nom: "Admin", prenom: "Super", email: "admin@test.com", motDePasseHashe: hashedPassword, role: "ADMIN", actif: true }}),
    prisma.utilisateur.upsert({ where: { email: "superviseur@test.com" }, update: {}, create: { nom: "Dupont", prenom: "Marie", email: "superviseur@test.com", motDePasseHashe: hashedPassword, role: "SUPERVISEUR", actif: true }}),
    prisma.utilisateur.upsert({ where: { email: "auditeur@test.com" }, update: {}, create: { nom: "Koné", prenom: "Jean", email: "auditeur@test.com", motDePasseHashe: hashedPassword, role: "AUDITEUR", actif: true }}),
  ]);

  console.log("✅ 3 Utilisateurs créés");

  // ==================== 2. ACTIFS ====================
  const actifs = await Promise.all([
    prisma.actif.create({ data: { nom: "Serveur Production", adresseIP: "192.168.10.10", hostname: "prod-srv-01", type: "SERVEUR", criticite: "CRITIQUE" }}),
    prisma.actif.create({ data: { nom: "Application Web E-commerce", adresseIP: "192.168.10.50", hostname: "web-app", type: "APPLICATION", criticite: "ELEVE" }}),
    prisma.actif.create({ data: { nom: "Firewall Principal", adresseIP: "192.168.10.1", hostname: "fw-01", type: "FIREWALL", criticite: "CRITIQUE" }})
  ]);

  console.log("✅ 3 Actifs créés");

  // ==================== 3. SCANS ====================
  const scans = await Promise.all([
    prisma.scan.create({ data: { idActif: actifs[0].id, lancerPar: users[0].id, type: "VULNERABILITE", outil: "NUCLEI", statut: "TERMINE", duree: 245 }}),
    prisma.scan.create({ data: { idActif: actifs[1].id, lancerPar: users[1].id, type: "COMPLIANCE", outil: "OPENVAS", statut: "TERMINE", duree: 680 }}),
    prisma.scan.create({ data: { idActif: actifs[2].id, lancerPar: users[2].id, type: "VULNERABILITE", outil: "GRYPE", statut: "EN_COURS" }})
  ]);

  console.log("✅ 3 Scans créés");

  // ==================== 4. VULNÉRABILITÉS ====================
  await Promise.all([
    prisma.vulnerabilite.create({ data: { idScan: scans[0].id, cveId: "CVE-2024-1234", titre: "Injection SQL critique", severite: "CRITICAL", statut: "OUVERTE", assigneA: users[1].id }}),
    prisma.vulnerabilite.create({ data: { idScan: scans[1].id, cveId: "CVE-2024-5678", titre: "Cross-Site Scripting (XSS)", severite: "HIGH", statut: "EN_COURS", assigneA: users[0].id }}),
    prisma.vulnerabilite.create({ data: { idScan: scans[0].id, cveId: "CVE-2024-9012", titre: "Accès non autorisé aux données", severite: "MEDIUM", statut: "OUVERTE" }})
  ]);

  console.log("✅ 3 Vulnérabilités créées");

  console.log("\n🎉 SEEDING TERMINÉ AVEC SUCCÈS !");
  console.log("→ admin@test.com / test123");
  console.log("→ superviseur@test.com / test123");
  console.log("→ auditeur@test.com / test123");
}

main()
  .catch((e) => console.error("❌ Erreur :", e))
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });