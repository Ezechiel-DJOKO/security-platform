/*
  Warnings:

  - Made the column `domaine` on table `controles_conformite` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "controles_conformite" ADD COLUMN     "ponderation" INTEGER NOT NULL DEFAULT 10,
ALTER COLUMN "domaine" SET NOT NULL;

-- CreateIndex
CREATE INDEX "controles_conformite_domaine_idx" ON "controles_conformite"("domaine");

-- CreateIndex
CREATE INDEX "controles_conformite_theme_idx" ON "controles_conformite"("theme");

-- CreateIndex
CREATE INDEX "controles_conformite_statut_idx" ON "controles_conformite"("statut");
