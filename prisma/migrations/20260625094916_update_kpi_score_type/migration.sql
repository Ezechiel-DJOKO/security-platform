/*
  Warnings:

  - You are about to alter the column `scoreISO27001` on the `kpi_history` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.

*/
-- AlterTable
ALTER TABLE "kpi_history" ALTER COLUMN "scoreISO27001" SET DEFAULT 0,
ALTER COLUMN "scoreISO27001" SET DATA TYPE INTEGER;
