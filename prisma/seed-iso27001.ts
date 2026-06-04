// prisma/seed-iso27001.ts
import { prisma } from '@/lib/prisma'   // ← Adaptation selon ton architecture

const isoControls = [
  // 5. Contrôles organisationnels
  { code: "5.1", nom: "Politiques de sécurité de l'information", domaine: "Contrôles organisationnels", theme: "Gouvernance" },
  { code: "5.2", nom: "Rôles et responsabilités en matière de sécurité", domaine: "Contrôles organisationnels", theme: "Gouvernance" },
  { code: "5.3", nom: "Séparation des tâches", domaine: "Contrôles organisationnels", theme: "Gouvernance" },
  { code: "5.4", nom: "Gestion des responsabilités de la direction", domaine: "Contrôles organisationnels", theme: "Gouvernance" },

  // 6. Contrôles liés aux personnes
  { code: "6.1", nom: "Sélection et recrutement", domaine: "Contrôles liés aux personnes", theme: "Ressources humaines" },
  { code: "6.2", nom: "Termes et conditions d'emploi", domaine: "Contrôles liés aux personnes", theme: "Ressources humaines" },
  { code: "6.3", nom: "Sensibilisation, éducation et formation à la sécurité", domaine: "Contrôles liés aux personnes", theme: "Sensibilisation" },
  { code: "6.4", nom: "Processus de gestion des départs et changements de rôle", domaine: "Contrôles liés aux personnes", theme: "Ressources humaines" },
  { code: "6.5", nom: "Accords de confidentialité", domaine: "Contrôles liés aux personnes", theme: "Confidentialité" },

  // 7. Contrôles physiques et environnementaux
  { code: "7.1", nom: "Périmètre de sécurité physique", domaine: "Contrôles physiques", theme: "Protection physique" },
  { code: "7.2", nom: "Contrôles d'entrée", domaine: "Contrôles physiques", theme: "Protection physique" },
  { code: "7.3", nom: "Sécurité des bureaux et des équipements", domaine: "Contrôles physiques", theme: "Protection physique" },
  { code: "7.4", nom: "Surveillance physique", domaine: "Contrôles physiques", theme: "Protection physique" },
  { code: "7.5", nom: "Travail en dehors des locaux de l'organisation", domaine: "Contrôles physiques", theme: "Télétravail" },
  { code: "7.6", nom: "Sécurité des équipements hors site", domaine: "Contrôles physiques", theme: "Protection physique" },
  { code: "7.7", nom: "Élimination ou réutilisation sécurisée d'équipements", domaine: "Contrôles physiques", theme: "Élimination" },
  { code: "7.8", nom: "Emplacement et protection des équipements", domaine: "Contrôles physiques", theme: "Protection physique" },
  { code: "7.9", nom: "Sécurité des câbles", domaine: "Contrôles physiques", theme: "Protection physique" },
  { code: "7.10", nom: "Maintenance des équipements", domaine: "Contrôles physiques", theme: "Maintenance" },
  { code: "7.11", nom: "Gestion des actifs mobiles", domaine: "Contrôles physiques", theme: "Appareils mobiles" },
  { code: "7.12", nom: "Gestion des supports de stockage", domaine: "Contrôles physiques", theme: "Supports" },
  { code: "7.13", nom: "Suppression sécurisée des données", domaine: "Contrôles physiques", theme: "Élimination" },

  // 8. Contrôles technologiques
  { code: "8.1", nom: "Gestion des utilisateurs", domaine: "Contrôles technologiques", theme: "Gestion des accès" },
  { code: "8.2", nom: "Privilèges d'accès", domaine: "Contrôles technologiques", theme: "Gestion des accès" },
  { code: "8.3", nom: "Gestion des informations d'identification", domaine: "Contrôles technologiques", theme: "Authentification" },
  { code: "8.4", nom: "Contrôle d'accès aux systèmes et applications", domaine: "Contrôles technologiques", theme: "Gestion des accès" },
  { code: "8.5", nom: "Authentification sécurisée", domaine: "Contrôles technologiques", theme: "Authentification" },
  { code: "8.6", nom: "Gestion des capacités", domaine: "Contrôles technologiques", theme: "Ressources" },
  { code: "8.7", nom: "Protection contre les logiciels malveillants", domaine: "Contrôles technologiques", theme: "Malware" },
  { code: "8.8", nom: "Gestion des vulnérabilités techniques", domaine: "Contrôles technologiques", theme: "Gestion des vulnérabilités" },
  { code: "8.9", nom: "Configuration de la sécurité", domaine: "Contrôles technologiques", theme: "Configuration" },
  { code: "8.10", nom: "Suppression d'informations", domaine: "Contrôles technologiques", theme: "Suppression" },
  { code: "8.11", nom: "Sauvegarde", domaine: "Contrôles technologiques", theme: "Sauvegarde" },
  { code: "8.12", nom: "Journalisation et surveillance", domaine: "Contrôles technologiques", theme: "Surveillance" },
  { code: "8.13", nom: "Protection des informations", domaine: "Contrôles technologiques", theme: "Protection des données" },
  { code: "8.14", nom: "Sécurité des systèmes de développement", domaine: "Contrôles technologiques", theme: "Développement sécurisé" },
  { code: "8.15", nom: "Gestion des vulnérabilités", domaine: "Contrôles technologiques", theme: "Gestion des vulnérabilités" },
  { code: "8.16", nom: "Cryptographie", domaine: "Contrôles technologiques", theme: "Cryptographie" },
  { code: "8.17", nom: "Sécurité des réseaux", domaine: "Contrôles technologiques", theme: "Réseaux" },
  { code: "8.18", nom: "Sécurité des services externalisés", domaine: "Contrôles technologiques", theme: "Cloud & Fournisseurs" },
  { code: "8.19", nom: "Tests de sécurité", domaine: "Contrôles technologiques", theme: "Tests" },
  { code: "8.20", nom: "Sécurité des applications web", domaine: "Contrôles technologiques", theme: "Applications web" },
  { code: "8.21", nom: "Gestion de la configuration", domaine: "Contrôles technologiques", theme: "Configuration" },
  { code: "8.22", nom: "Tests de pénétration", domaine: "Contrôles technologiques", theme: "Tests" },
  { code: "8.23", nom: "Filtrage des contenus", domaine: "Contrôles technologiques", theme: "Protection" },
  { code: "8.24", nom: "Utilisation de la cryptographie", domaine: "Contrôles technologiques", theme: "Cryptographie" },
  { code: "8.25", nom: "Authentification multifactorielle", domaine: "Contrôles technologiques", theme: "Authentification" },
  { code: "8.26", nom: "Séparation des environnements", domaine: "Contrôles technologiques", theme: "Environnements" },
  { code: "8.27", nom: "Protection des données à caractère personnel", domaine: "Contrôles technologiques", theme: "Confidentialité" },
  { code: "8.28", nom: "Gestion des incidents de sécurité", domaine: "Contrôles technologiques", theme: "Gestion des incidents" },
  { code: "8.29", nom: "Continuité d'activité", domaine: "Contrôles technologiques", theme: "Continuité" },
  { code: "8.30", nom: "Conformité légale et réglementaire", domaine: "Contrôles technologiques", theme: "Conformité" },
]

async function main() {
  console.log("🌱 Lancement du seed ISO 27001 (93 contrôles)...")

  let count = 0

  for (const ctrl of isoControls) {
    await prisma.controlConformite.upsert({
      where: {
        referentiel_code: {
          referentiel: "ISO27001",
          code: ctrl.code,
        },
      },
      update: {},
      create: {
        referentiel: "ISO27001",
        code: ctrl.code,
        nom: ctrl.nom,
        description: ctrl.nom,           // Tu pourras enrichir les descriptions plus tard
        domaine: ctrl.domaine,
        theme: ctrl.theme,
      },
    })
    count++
  }

  console.log(`✅ Seed ISO 27001 terminé ! ${count} contrôles insérés.`)
}

main()
  .catch((e) => {
    console.error("Erreur pendant le seed :", e)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })