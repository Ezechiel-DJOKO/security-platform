/*
  Warnings:

  - You are about to drop the column `mfaBackupCodes` on the `utilisateur` table. All the data in the column will be lost.
  - You are about to drop the column `mfaEnabled` on the `utilisateur` table. All the data in the column will be lost.
  - You are about to drop the column `mfaEnabledAt` on the `utilisateur` table. All the data in the column will be lost.
  - You are about to drop the column `mfaSecret` on the `utilisateur` table. All the data in the column will be lost.
  - You are about to drop the column `motDePasseHashe` on the `utilisateur` table. All the data in the column will be lost.
  - You are about to drop the column `tempsResolution` on the `vulnerabilites` table. All the data in the column will be lost.
  - Added the required column `motDePasseHash` to the `utilisateur` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "RoleUtilisateur" ADD VALUE 'TECHNICIEN';

-- AlterEnum
ALTER TYPE "StatutPlan" ADD VALUE 'REJETEE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TypeAction" ADD VALUE 'SCAN_COMPLETED';
ALTER TYPE "TypeAction" ADD VALUE 'REJET';

-- DropForeignKey
ALTER TABLE "plans_correction" DROP CONSTRAINT "plans_correction_assigneA_fkey";

-- AlterTable
ALTER TABLE "plans_correction" ALTER COLUMN "assigneA" DROP NOT NULL;

-- AlterTable
ALTER TABLE "scans" ADD COLUMN     "resultatOpenvas" JSONB;

-- AlterTable
ALTER TABLE "utilisateur" DROP COLUMN "mfaBackupCodes",
DROP COLUMN "mfaEnabled",
DROP COLUMN "mfaEnabledAt",
DROP COLUMN "mfaSecret",
DROP COLUMN "motDePasseHashe",
ADD COLUMN     "motDePasseHash" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "vulnerabilites" DROP COLUMN "tempsResolution";

-- CreateIndex
CREATE INDEX "actifs_type_idx" ON "actifs"("type");

-- CreateIndex
CREATE INDEX "vulnerabilites_statut_idx" ON "vulnerabilites"("statut");

-- CreateIndex
CREATE INDEX "vulnerabilites_severite_idx" ON "vulnerabilites"("severite");

-- CreateIndex
CREATE INDEX "vulnerabilites_assigneA_idx" ON "vulnerabilites"("assigneA");

-- AddForeignKey
ALTER TABLE "plans_correction" ADD CONSTRAINT "plans_correction_assigneA_fkey" FOREIGN KEY ("assigneA") REFERENCES "utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;
