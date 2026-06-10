-- AlterTable
ALTER TABLE "vulnerabilites" ADD COLUMN     "tempsResolution" INTEGER;

-- CreateTable
CREATE TABLE "kpi_history" (
    "id" UUID NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pourcentageCritiquesResolus" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "delaiMoyenCorrection" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scoreISO27001" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalVulnerabilites" INTEGER NOT NULL DEFAULT 0,
    "vulnsCritiques" INTEGER NOT NULL DEFAULT 0,
    "vulnsCorrigees" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kpi_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "kpi_history_date_key" ON "kpi_history"("date");
