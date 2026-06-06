-- DropIndex
DROP INDEX "controles_conformite_statut_idx";

-- AlterTable
ALTER TABLE "controles_conformite" ALTER COLUMN "domaine" DROP NOT NULL;
