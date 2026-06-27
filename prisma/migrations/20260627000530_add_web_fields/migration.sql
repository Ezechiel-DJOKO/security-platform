-- CreateEnum
CREATE TYPE "TypeVulnerabilite" AS ENUM ('NETWORK', 'WEB_APP', 'API', 'CLOUD', 'CONTAINER', 'DEPENDENCY', 'CONFIG', 'OTHER');

-- AlterTable
ALTER TABLE "vulnerabilites" ADD COLUMN     "endpoint" TEXT,
ADD COLUMN     "methodeHttp" TEXT,
ADD COLUMN     "payload" TEXT,
ADD COLUMN     "typeVulnerabilite" "TypeVulnerabilite",
ADD COLUMN     "urlCible" TEXT;
