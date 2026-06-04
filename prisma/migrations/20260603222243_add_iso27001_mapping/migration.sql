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
CREATE TYPE "OutilScan" AS ENUM ('NESSUS', 'OPENVAS', 'QUALYS', 'BURP_SUITE', 'TRIVY', 'ZAP', 'MANUAL', 'GRYPE', 'NUCLEI');

-- CreateEnum
CREATE TYPE "FormatRapport" AS ENUM ('PDF', 'JSON', 'CSV', 'HTML', 'MARKDOWN');

-- CreateEnum
CREATE TYPE "Priorite" AS ENUM ('BASSE', 'MOYENNE', 'HAUTE', 'CRITIQUE');

-- CreateEnum
CREATE TYPE "StatutPlan" AS ENUM ('A_FAIRE', 'EN_COURS', 'TERMINE', 'EN_RETARD', 'ANNULE', 'VERIFIE');

-- CreateEnum
CREATE TYPE "StatutConformite" AS ENUM ('CONFORME', 'NON_CONFORME', 'PARTIELLEMENT', 'NON_EVALUE', 'NON_APPLICABLE');

-- CreateEnum
CREATE TYPE "TypeAction" AS ENUM ('CONNEXION', 'DECONNEXION', 'CREATION', 'MODIFICATION', 'SUPPRESSION', 'LECTURE', 'EXPORT', 'SCAN', 'ASSIGNATION', 'VALIDATION');

-- CreateEnum
CREATE TYPE "EntiteCible" AS ENUM ('UTILISATEUR', 'ACTIF', 'SCAN', 'VULNERABILITE', 'PLAN_CORRECTION', 'RAPPORT', 'CONTROLE_CONFORMITE');

-- CreateTable
CREATE TABLE "utilisateur" (
    "id" UUID NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "motDePasseHashe" TEXT NOT NULL,
    "role" "RoleUtilisateur" NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "utilisateur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actifs" (
    "id" UUID NOT NULL,
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
    "id" UUID NOT NULL,
    "idActif" UUID NOT NULL,
    "lancerPar" UUID NOT NULL,
    "type" "TypeScan" NOT NULL,
    "outil" "OutilScan" NOT NULL,
    "statut" "StatutScan" NOT NULL DEFAULT 'PLANIFIE',
    "debut" TIMESTAMP(3),
    "fin" TIMESTAMP(3),
    "duree" INTEGER,
    "resultatBrut" JSONB,
    "metadata" JSONB,
    "erreur" TEXT,
    "cible" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vulnerabilites" (
    "id" UUID NOT NULL,
    "idScan" UUID NOT NULL,
    "cveId" TEXT,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "severite" "Severite" NOT NULL,
    "scoreCVSS" DOUBLE PRECISION,
    "cvssVersion" TEXT,
    "epssScore" DOUBLE PRECISION,
    "vecteurCVSS" TEXT,
    "statut" "StatutVulnerabilite" NOT NULL DEFAULT 'OUVERTE',
    "assigneA" UUID,
    "preuve" TEXT,
    "impact" TEXT,
    "recommandation" TEXT,
    "risqueRelatif" DOUBLE PRECISION,
    "dateDecouverte" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateCorrection" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "vulnerabilites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans_correction" (
    "id" UUID NOT NULL,
    "idVulnerabilite" UUID NOT NULL,
    "assigneA" UUID NOT NULL,
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
    "id" UUID NOT NULL,
    "idVulnerabilite" UUID NOT NULL,
    "ancienStatut" "StatutVulnerabilite" NOT NULL,
    "nouveauStatut" "StatutVulnerabilite" NOT NULL,
    "commentaire" TEXT,
    "modifiePar" UUID NOT NULL,
    "dateModification" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historique_vulnerabilites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rapports_audit" (
    "id" UUID NOT NULL,
    "generePar" UUID NOT NULL,
    "idActif" UUID NOT NULL,
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
    "id" UUID NOT NULL,
    "referentiel" TEXT NOT NULL DEFAULT 'ISO27001',
    "code" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "domaine" TEXT,
    "theme" TEXT,
    "statut" "StatutConformite" NOT NULL DEFAULT 'NON_EVALUE',

    CONSTRAINT "controles_conformite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vulnerabilite_control" (
    "id" UUID NOT NULL,
    "vulnerabiliteId" UUID NOT NULL,
    "controleId" UUID NOT NULL,
    "niveauPertinence" INTEGER NOT NULL DEFAULT 80,
    "justification" TEXT,
    "sourceMapping" TEXT NOT NULL DEFAULT 'AUTO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vulnerabilite_control_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control_scan" (
    "id" UUID NOT NULL,
    "idScan" UUID NOT NULL,
    "idControle" UUID NOT NULL,
    "statut" "StatutConformite" NOT NULL,
    "commentaire" TEXT,
    "preuve" TEXT,

    CONSTRAINT "control_scan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "idUtilisateur" UUID,
    "action" "TypeAction" NOT NULL,
    "entite" "EntiteCible" NOT NULL,
    "idEntite" TEXT,
    "details" JSONB,
    "ipAdresse" TEXT,
    "userAgent" TEXT,
    "dateAction" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" UUID NOT NULL,
    "nom" TEXT NOT NULL,
    "couleur" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tag_vulnerabilite" (
    "id" UUID NOT NULL,
    "vulnerabiliteId" UUID NOT NULL,
    "tagId" UUID NOT NULL,

    CONSTRAINT "tag_vulnerabilite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "utilisateur_email_key" ON "utilisateur"("email");

-- CreateIndex
CREATE INDEX "actifs_adresseIP_idx" ON "actifs"("adresseIP");

-- CreateIndex
CREATE INDEX "actifs_criticite_idx" ON "actifs"("criticite");

-- CreateIndex
CREATE UNIQUE INDEX "plans_correction_idVulnerabilite_key" ON "plans_correction"("idVulnerabilite");

-- CreateIndex
CREATE UNIQUE INDEX "controles_conformite_referentiel_code_key" ON "controles_conformite"("referentiel", "code");

-- CreateIndex
CREATE UNIQUE INDEX "vulnerabilite_control_vulnerabiliteId_controleId_key" ON "vulnerabilite_control"("vulnerabiliteId", "controleId");

-- CreateIndex
CREATE INDEX "audit_logs_idUtilisateur_idx" ON "audit_logs"("idUtilisateur");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_entite_idx" ON "audit_logs"("entite");

-- CreateIndex
CREATE INDEX "audit_logs_dateAction_idx" ON "audit_logs"("dateAction");

-- CreateIndex
CREATE UNIQUE INDEX "tags_nom_key" ON "tags"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "tag_vulnerabilite_vulnerabiliteId_tagId_key" ON "tag_vulnerabilite"("vulnerabiliteId", "tagId");

-- AddForeignKey
ALTER TABLE "scans" ADD CONSTRAINT "scans_idActif_fkey" FOREIGN KEY ("idActif") REFERENCES "actifs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scans" ADD CONSTRAINT "scans_lancerPar_fkey" FOREIGN KEY ("lancerPar") REFERENCES "utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vulnerabilites" ADD CONSTRAINT "vulnerabilites_idScan_fkey" FOREIGN KEY ("idScan") REFERENCES "scans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vulnerabilites" ADD CONSTRAINT "vulnerabilites_assigneA_fkey" FOREIGN KEY ("assigneA") REFERENCES "utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plans_correction" ADD CONSTRAINT "plans_correction_idVulnerabilite_fkey" FOREIGN KEY ("idVulnerabilite") REFERENCES "vulnerabilites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plans_correction" ADD CONSTRAINT "plans_correction_assigneA_fkey" FOREIGN KEY ("assigneA") REFERENCES "utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historique_vulnerabilites" ADD CONSTRAINT "historique_vulnerabilites_idVulnerabilite_fkey" FOREIGN KEY ("idVulnerabilite") REFERENCES "vulnerabilites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historique_vulnerabilites" ADD CONSTRAINT "historique_vulnerabilites_modifiePar_fkey" FOREIGN KEY ("modifiePar") REFERENCES "utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rapports_audit" ADD CONSTRAINT "rapports_audit_generePar_fkey" FOREIGN KEY ("generePar") REFERENCES "utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rapports_audit" ADD CONSTRAINT "rapports_audit_idActif_fkey" FOREIGN KEY ("idActif") REFERENCES "actifs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vulnerabilite_control" ADD CONSTRAINT "vulnerabilite_control_vulnerabiliteId_fkey" FOREIGN KEY ("vulnerabiliteId") REFERENCES "vulnerabilites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vulnerabilite_control" ADD CONSTRAINT "vulnerabilite_control_controleId_fkey" FOREIGN KEY ("controleId") REFERENCES "controles_conformite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_scan" ADD CONSTRAINT "control_scan_idScan_fkey" FOREIGN KEY ("idScan") REFERENCES "scans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_scan" ADD CONSTRAINT "control_scan_idControle_fkey" FOREIGN KEY ("idControle") REFERENCES "controles_conformite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_idUtilisateur_fkey" FOREIGN KEY ("idUtilisateur") REFERENCES "utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tag_vulnerabilite" ADD CONSTRAINT "tag_vulnerabilite_vulnerabiliteId_fkey" FOREIGN KEY ("vulnerabiliteId") REFERENCES "vulnerabilites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tag_vulnerabilite" ADD CONSTRAINT "tag_vulnerabilite_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
