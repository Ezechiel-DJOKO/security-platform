// seed.ts
import "dotenv/config";
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Début du seeding complet...");

  // ==================== 1. UTILISATEURS (3) ====================
  // Mot de passe commun : test123
  const users = await Promise.all([
    prisma.utilisateur.upsert({
      where: { email: "admin@test.com" },
      update: {},
      create: {
        nom: "Admin",
        prenom: "Super",
        email: "admin@test.com",
        motDePasseHashe: "$2a$10$wE99qWJ7g09XvjC7W2yDSe99F9qF8rVn9kG3J2vX3q4W8sXm5K1hG", 
        role: "ADMIN",
        actif: true
      }
    }),
    prisma.utilisateur.upsert({
      where: { email: "superviseur@test.com" },
      update: {},
      create: {
        nom: "Dupont",
        prenom: "Marie",
        email: "superviseur@test.com",
        motDePasseHashe: "$2a$10$wE99qWJ7g09XvjC7W2yDSe99F9qF8rVn9kG3J2vX3q4W8sXm5K1hG",         
        role: "SUPERVISEUR",
        actif: true
      }
    }),
    prisma.utilisateur.upsert({
      where: { email: "auditeur@test.com" },
      update: {},
      create: {
        nom: "Koné",
        prenom: "Jean",
        email: "auditeur@test.com",
        motDePasseHashe: "$2a$10$wE99qWJ7g09XvjC7W2yDSe99F9qF8rVn9kG3J2vX3q4W8sXm5K1hG", 
        role: "AUDITEUR",
        actif: true
      }
    })
  ]);

  console.log("✅ 3 Utilisateurs créés (mot de passe : test123)");

  // ==================== 2. ACTIFS (3) ====================
  const actifs = await Promise.all([
    prisma.actif.create({
      data: { nom: "Serveur Production", adresseIP: "192.168.10.10", hostname: "prod-srv-01", type: "SERVEUR", criticite: "CRITIQUE" }
    }),
    prisma.actif.create({
      data: { nom: "Application Web E-commerce", adresseIP: "192.168.10.50", hostname: "web-app", type: "APPLICATION", criticite: "ELEVE" }
    }),
    prisma.actif.create({
      data: { nom: "Firewall Principal", adresseIP: "192.168.10.1", hostname: "fw-01", type: "FIREWALL", criticite: "CRITIQUE" }
    })
  ]);

  console.log("✅ 3 Actifs créés");

  // ==================== 3. SCANS (3) ====================
  const scans = await Promise.all([
    prisma.scan.create({
      data: { idActif: actifs[0].id, lancerPar: users[0].id, type: "VULNERABILITE", outil: "NUCLEI", statut: "TERMINE", duree: 245 }
    }),
    prisma.scan.create({
      data: { idActif: actifs[1].id, lancerPar: users[1].id, type: "COMPLIANCE", outil: "OPENVAS", statut: "TERMINE", duree: 680 }
    }),
    prisma.scan.create({
      data: { idActif: actifs[2].id, lancerPar: users[2].id, type: "VULNERABILITE", outil: "GRYPE", statut: "EN_COURS" }
    })
  ]);

  console.log("✅ 3 Scans créés");

  // ==================== 4. VULNÉRABILITÉS (3) ====================
  const vulns = await Promise.all([
    prisma.vulnerabilite.create({
      data: {
        idScan: scans[0].id,
        cveId: "CVE-2024-1234",
        titre: "Injection SQL critique",
        severite: "CRITICAL",
        statut: "OUVERTE",
        assigneA: users[1].id
      }
    }),
    prisma.vulnerabilite.create({
      data: {
        idScan: scans[1].id,
        cveId: "CVE-2024-5678",
        titre: "Cross-Site Scripting (XSS)",
        severite: "HIGH",
        statut: "EN_COURS",
        assigneA: users[0].id
      }
    }),
    prisma.vulnerabilite.create({
      data: {
        idScan: scans[0].id,
        cveId: "CVE-2024-9012",
        titre: "Accès non autorisé aux données",
        severite: "MEDIUM",
        statut: "OUVERTE"
      }
    })
  ]);

  console.log("✅ 3 Vulnérabilités créées");

  // ==================== 5. PLANS DE CORRECTION (3) ====================
  await Promise.all([
    prisma.planCorrection.create({
      data: {
        idVulnerabilite: vulns[0].id,
        assigneA: users[1].id,
        priorite: "CRITIQUE",
        dateEcheance: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    }),
    prisma.planCorrection.create({
      data: {
        idVulnerabilite: vulns[1].id,
        assigneA: users[0].id,
        priorite: "HAUTE",
        dateEcheance: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      }
    }),
    prisma.planCorrection.create({
      data: {
        idVulnerabilite: vulns[2].id,
        assigneA: users[2].id,
        priorite: "MOYENNE",
        dateEcheance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    })
  ]);

  console.log("✅ 3 Plans de correction créés");

  console.log("\n🎉 SEEDING TERMINÉ AVEC SUCCÈS !");
  console.log("Identifiants de test :");
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