-- CreateEnum
CREATE TYPE "TypeAction" AS ENUM ('CONNEXION', 'DECONNEXION', 'CREATION', 'MODIFICATION', 'SUPPRESSION', 'LECTURE', 'EXPORT', 'SCAN', 'ASSIGNATION', 'VALIDATION');

-- CreateEnum
CREATE TYPE "EntiteCible" AS ENUM ('UTILISATEUR', 'ACTIF', 'SCAN', 'VULNERABILITE', 'PLAN_CORRECTION', 'RAPPORT', 'CONTROLE_CONFORMITE');

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "idUtilisateur" TEXT,
    "action" "TypeAction" NOT NULL,
    "entite" "EntiteCible" NOT NULL,
    "idEntite" TEXT,
    "details" JSONB,
    "ipAdresse" TEXT,
    "userAgent" TEXT,
    "dateAction" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_idUtilisateur_idx" ON "audit_logs"("idUtilisateur");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_entite_idx" ON "audit_logs"("entite");

-- CreateIndex
CREATE INDEX "audit_logs_dateAction_idx" ON "audit_logs"("dateAction");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_idUtilisateur_fkey" FOREIGN KEY ("idUtilisateur") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;
