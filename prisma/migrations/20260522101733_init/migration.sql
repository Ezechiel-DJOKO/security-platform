-- CreateEnum
CREATE TYPE "RoleUtilisateur" AS ENUM ('ADMIN', 'SUPERVISEUR', 'AUDITEUR');

-- CreateEnum
CREATE TYPE "TypeActif" AS ENUM ('SERVEUR', 'WORKSTATION', 'FIREWALL', 'ROUTER', 'APPLICATION', 'BDD', 'CLOUD', 'AUTRE');

-- CreateEnum
CREATE TYPE "NiveauCriticite" AS ENUM ('BAS', 'MOYEN', 'ELEVE', 'CRITIQUE');

-- CreateEnum
CREATE TYPE "Severite" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "StatutVulnerabilite" AS ENUM ('OUVERTE', 'EN_COURS', 'CORRIGEE', 'IGNORE', 'RISQUE_ACCEPTE', 'VERIFIEE');

-- CreateEnum
CREATE TYPE "StatutScan" AS ENUM ('PLANIFIE', 'EN_COURS', 'TERMINE', 'ANNULE', 'ECHEC');

-- CreateEnum
CREATE TYPE "TypeScan" AS ENUM ('VULNERABILITE', 'COMPLIANCE', 'PENETRATION', 'CONFIGURATION');

-- CreateEnum
CREATE TYPE "OutilScan" AS ENUM ('NESSUS', 'OPENVAS', 'QUALYS', 'BURP_SUITE', 'TRIVY', 'ZAP', 'MANUAL');

-- CreateEnum
CREATE TYPE "FormatRapport" AS ENUM ('PDF', 'JSON', 'CSV', 'HTML', 'MARKDOWN');

-- CreateEnum
CREATE TYPE "Priorite" AS ENUM ('BASSE', 'MOYENNE', 'HAUTE', 'CRITIQUE');

-- CreateEnum
CREATE TYPE "StatutPlan" AS ENUM ('A_FAIRE', 'EN_COURS', 'TERMINE', 'EN_RETARD', 'ANNULE', 'VERIFIE');

-- CreateEnum
CREATE TYPE "StatutConformite" AS ENUM ('CONFORME', 'NON_CONFORME', 'PARTIELLEMENT', 'NON_EVALUE');

-- CreateTable
CREATE TABLE "Utilisateur" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "motDePasseHashe" TEXT NOT NULL,
    "role" "RoleUtilisateur" NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Utilisateur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actifs" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "adresseIP" TEXT,
    "hostname" TEXT,
    "type" "TypeActif" NOT NULL,
    "criticite" "NiveauCriticite" NOT NULL,
    "localisation" TEXT,
    "dernierScan" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "actifs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scans" (
    "id" TEXT NOT NULL,
    "idActif" TEXT NOT NULL,
    "lancerPar" TEXT NOT NULL,
    "type" "TypeScan" NOT NULL,
    "outil" "OutilScan" NOT NULL,
    "statut" "StatutScan" NOT NULL DEFAULT 'PLANIFIE',
    "debut" TIMESTAMP(3),
    "fin" TIMESTAMP(3),
    "duree" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vulnerabilites" (
    "id" TEXT NOT NULL,
    "idScan" TEXT NOT NULL,
    "cveId" TEXT,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "severite" "Severite" NOT NULL,
    "scoreCVSS" DOUBLE PRECISION,
    "vecteurCVSS" TEXT,
    "statut" "StatutVulnerabilite" NOT NULL DEFAULT 'OUVERTE',
    "assigneA" TEXT,
    "preuve" TEXT,
    "impact" TEXT,
    "recommandation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "vulnerabilites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans_correction" (
    "id" TEXT NOT NULL,
    "idVulnerabilite" TEXT NOT NULL,
    "assigneA" TEXT NOT NULL,
    "priorite" "Priorite" NOT NULL,
    "dateEcheance" TIMESTAMP(3) NOT NULL,
    "statut" "StatutPlan" NOT NULL DEFAULT 'A_FAIRE',
    "commentaire" TEXT,
    "dateResolution" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_correction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historique_vulnerabilites" (
    "id" TEXT NOT NULL,
    "idVulnerabilite" TEXT NOT NULL,
    "ancienStatut" "StatutVulnerabilite" NOT NULL,
    "nouveauStatut" "StatutVulnerabilite" NOT NULL,
    "commentaire" TEXT,
    "modifiePar" TEXT NOT NULL,
    "dateModification" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historique_vulnerabilites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rapports_audit" (
    "id" TEXT NOT NULL,
    "generePar" TEXT NOT NULL,
    "idActif" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "format" "FormatRapport" NOT NULL,
    "urlFichier" TEXT,
    "genereLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rapports_audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "controles_conformite" (
    "id" TEXT NOT NULL,
    "referentiel" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "statut" "StatutConformite" NOT NULL DEFAULT 'NON_EVALUE',

    CONSTRAINT "controles_conformite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control_scan" (
    "id" TEXT NOT NULL,
    "idScan" TEXT NOT NULL,
    "idControle" TEXT NOT NULL,
    "statut" "StatutConformite" NOT NULL,
    "commentaire" TEXT,
    "preuve" TEXT,

    CONSTRAINT "control_scan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_email_key" ON "Utilisateur"("email");

-- CreateIndex
CREATE INDEX "actifs_adresseIP_idx" ON "actifs"("adresseIP");

-- CreateIndex
CREATE INDEX "actifs_criticite_idx" ON "actifs"("criticite");

-- CreateIndex
CREATE INDEX "vulnerabilites_cveId_idx" ON "vulnerabilites"("cveId");

-- CreateIndex
CREATE INDEX "vulnerabilites_statut_idx" ON "vulnerabilites"("statut");

-- CreateIndex
CREATE INDEX "vulnerabilites_severite_idx" ON "vulnerabilites"("severite");

-- CreateIndex
CREATE UNIQUE INDEX "plans_correction_idVulnerabilite_key" ON "plans_correction"("idVulnerabilite");

-- CreateIndex
CREATE UNIQUE INDEX "controles_conformite_referentiel_code_key" ON "controles_conformite"("referentiel", "code");

-- AddForeignKey
ALTER TABLE "scans" ADD CONSTRAINT "scans_idActif_fkey" FOREIGN KEY ("idActif") REFERENCES "actifs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scans" ADD CONSTRAINT "scans_lancerPar_fkey" FOREIGN KEY ("lancerPar") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vulnerabilites" ADD CONSTRAINT "vulnerabilites_idScan_fkey" FOREIGN KEY ("idScan") REFERENCES "scans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vulnerabilites" ADD CONSTRAINT "vulnerabilites_assigneA_fkey" FOREIGN KEY ("assigneA") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plans_correction" ADD CONSTRAINT "plans_correction_idVulnerabilite_fkey" FOREIGN KEY ("idVulnerabilite") REFERENCES "vulnerabilites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plans_correction" ADD CONSTRAINT "plans_correction_assigneA_fkey" FOREIGN KEY ("assigneA") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historique_vulnerabilites" ADD CONSTRAINT "historique_vulnerabilites_idVulnerabilite_fkey" FOREIGN KEY ("idVulnerabilite") REFERENCES "vulnerabilites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historique_vulnerabilites" ADD CONSTRAINT "historique_vulnerabilites_modifiePar_fkey" FOREIGN KEY ("modifiePar") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rapports_audit" ADD CONSTRAINT "rapports_audit_generePar_fkey" FOREIGN KEY ("generePar") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rapports_audit" ADD CONSTRAINT "rapports_audit_idActif_fkey" FOREIGN KEY ("idActif") REFERENCES "actifs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_scan" ADD CONSTRAINT "control_scan_idScan_fkey" FOREIGN KEY ("idScan") REFERENCES "scans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_scan" ADD CONSTRAINT "control_scan_idControle_fkey" FOREIGN KEY ("idControle") REFERENCES "controles_conformite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
