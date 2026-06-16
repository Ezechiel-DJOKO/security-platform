// scripts/fix-passwords.ts
import "dotenv/config";
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import crypto from 'crypto';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function main() {
  const hashCorrect = hashPassword("password123");
  console.log("Hash correct généré :", hashCorrect);

  await prisma.utilisateur.updateMany({
    where: {
      email: { in: ["admin@test.com", "auditeur@test.com", "superviseur@test.com"] }
    },
    data: {
      motDePasseHashe: hashCorrect
    }
  });

  console.log("✅ Tous les mots de passe ont été corrigés !");
  console.log("Utilise maintenant : password123");
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });