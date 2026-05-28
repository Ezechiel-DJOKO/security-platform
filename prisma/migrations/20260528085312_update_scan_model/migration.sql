-- DropIndex
DROP INDEX "vulnerabilites_severite_idx";

-- DropIndex
DROP INDEX "vulnerabilites_statut_idx";

-- AlterTable
ALTER TABLE "scans" ADD COLUMN     "erreur" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "resultatBrut" JSONB;

-- AlterTable
ALTER TABLE "vulnerabilites" ADD COLUMN     "cvssVersion" TEXT,
ADD COLUMN     "dateCorrection" TIMESTAMP(3),
ADD COLUMN     "dateDecouverte" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "epssScore" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "scans_statut_idx" ON "scans"("statut");

-- CreateIndex
CREATE INDEX "scans_type_idx" ON "scans"("type");

-- CreateIndex
CREATE INDEX "scans_debut_idx" ON "scans"("debut");

-- CreateIndex
CREATE INDEX "vulnerabilites_severite_statut_idx" ON "vulnerabilites"("severite", "statut");

-- CreateIndex
CREATE INDEX "vulnerabilites_scoreCVSS_idx" ON "vulnerabilites"("scoreCVSS");

-- CreateIndex
CREATE INDEX "vulnerabilites_assigneA_idx" ON "vulnerabilites"("assigneA");
