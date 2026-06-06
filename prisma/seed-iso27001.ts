// prisma/seed-iso27001.ts
import { prisma } from '@/lib/prisma'

const isoControls = [
  // === 5. Contrôles organisationnels (37) ===
  { code: "5.1", nom: "Policies for information security", domaine: "Contrôles organisationnels", theme: "Gouvernance" },
  { code: "5.2", nom: "Information security roles and responsibilities", domaine: "Contrôles organisationnels", theme: "Gouvernance" },
  { code: "5.3", nom: "Segregation of duties", domaine: "Contrôles organisationnels", theme: "Gouvernance" },
  { code: "5.4", nom: "Management responsibilities", domaine: "Contrôles organisationnels", theme: "Gouvernance" },
  { code: "5.5", nom: "Contact with authorities", domaine: "Contrôles organisationnels", theme: "Conformité" },
  { code: "5.6", nom: "Contact with special interest groups", domaine: "Contrôles organisationnels", theme: "Conformité" },
  { code: "5.7", nom: "Threat intelligence", domaine: "Contrôles organisationnels", theme: "Gestion des risques" },
  { code: "5.8", nom: "Information security in project management", domaine: "Contrôles organisationnels", theme: "Gestion de projets" },
  { code: "5.9", nom: "Inventory of information and other associated assets", domaine: "Contrôles organisationnels", theme: "Gestion des actifs" },
  { code: "5.10", nom: "Acceptable use of information and other associated assets", domaine: "Contrôles organisationnels", theme: "Gestion des actifs" },
  { code: "5.11", nom: "Return of assets", domaine: "Contrôles organisationnels", theme: "Gestion des actifs" },
  { code: "5.12", nom: "Classification of information", domaine: "Contrôles organisationnels", theme: "Classification" },
  { code: "5.13", nom: "Labelling of information", domaine: "Contrôles organisationnels", theme: "Classification" },
  { code: "5.14", nom: "Information transfer", domaine: "Contrôles organisationnels", theme: "Transfert d'information" },
  { code: "5.15", nom: "Access control", domaine: "Contrôles organisationnels", theme: "Contrôle d'accès" },
  { code: "5.16", nom: "Identity management", domaine: "Contrôles organisationnels", theme: "Gestion des identités" },
  { code: "5.17", nom: "Authentication information", domaine: "Contrôles organisationnels", theme: "Authentification" },
  { code: "5.18", nom: "Access rights", domaine: "Contrôles organisationnels", theme: "Gestion des accès" },
  { code: "5.19", nom: "Information security in supplier relationships", domaine: "Contrôles organisationnels", theme: "Fournisseurs" },
  { code: "5.20", nom: "Addressing information security within supplier agreements", domaine: "Contrôles organisationnels", theme: "Fournisseurs" },
  { code: "5.21", nom: "Managing information security in the ICT supply chain", domaine: "Contrôles organisationnels", theme: "Fournisseurs" },
  { code: "5.22", nom: "Monitoring, review and change management of supplier services", domaine: "Contrôles organisationnels", theme: "Fournisseurs" },
  { code: "5.23", nom: "Information security for use of cloud services", domaine: "Contrôles organisationnels", theme: "Cloud" },
  { code: "5.24", nom: "Information security incident management planning and preparation", domaine: "Contrôles organisationnels", theme: "Gestion des incidents" },
  { code: "5.25", nom: "Assessment and decision on information security events", domaine: "Contrôles organisationnels", theme: "Gestion des incidents" },
  { code: "5.26", nom: "Response to information security incidents", domaine: "Contrôles organisationnels", theme: "Gestion des incidents" },
  { code: "5.27", nom: "Learning from information security incidents", domaine: "Contrôles organisationnels", theme: "Gestion des incidents" },
  { code: "5.28", nom: "Collection of evidence", domaine: "Contrôles organisationnels", theme: "Gestion des incidents" },
  { code: "5.29", nom: "Information security during disruption", domaine: "Contrôles organisationnels", theme: "Continuité d'activité" },
  { code: "5.30", nom: "ICT readiness for business continuity", domaine: "Contrôles organisationnels", theme: "Continuité d'activité" },
  { code: "5.31", nom: "Legal, statutory, regulatory and contractual requirements", domaine: "Contrôles organisationnels", theme: "Conformité" },
  { code: "5.32", nom: "Intellectual property rights", domaine: "Contrôles organisationnels", theme: "Conformité" },
  { code: "5.33", nom: "Protection of records", domaine: "Contrôles organisationnels", theme: "Protection des données" },
  { code: "5.34", nom: "Privacy and protection of PII", domaine: "Contrôles organisationnels", theme: "Confidentialité" },
  { code: "5.35", nom: "Independent review of information security", domaine: "Contrôles organisationnels", theme: "Audit" },
  { code: "5.36", nom: "Compliance with policies, rules and standards for information security", domaine: "Contrôles organisationnels", theme: "Conformité" },
  { code: "5.37", nom: "Documented operating procedures", domaine: "Contrôles organisationnels", theme: "Documentation" },

  // === 6. Contrôles liés aux personnes (8) ===
  { code: "6.1", nom: "Screening", domaine: "Contrôles liés aux personnes", theme: "Ressources humaines" },
  { code: "6.2", nom: "Terms and conditions of employment", domaine: "Contrôles liés aux personnes", theme: "Ressources humaines" },
  { code: "6.3", nom: "Information security awareness, education and training", domaine: "Contrôles liés aux personnes", theme: "Sensibilisation" },
  { code: "6.4", nom: "Disciplinary process", domaine: "Contrôles liés aux personnes", theme: "Ressources humaines" },
  { code: "6.5", nom: "Responsibilities after termination or change of employment", domaine: "Contrôles liés aux personnes", theme: "Ressources humaines" },
  { code: "6.6", nom: "Confidentiality or non-disclosure agreements", domaine: "Contrôles liés aux personnes", theme: "Confidentialité" },
  { code: "6.7", nom: "Remote working", domaine: "Contrôles liés aux personnes", theme: "Télétravail" },
  { code: "6.8", nom: "Information security event reporting", domaine: "Contrôles liés aux personnes", theme: "Sensibilisation" },

  // === 7. Contrôles physiques (14) ===
  { code: "7.1", nom: "Physical security perimeters", domaine: "Contrôles physiques", theme: "Protection physique" },
  { code: "7.2", nom: "Physical entry", domaine: "Contrôles physiques", theme: "Protection physique" },
  { code: "7.3", nom: "Securing offices, rooms and facilities", domaine: "Contrôles physiques", theme: "Protection physique" },
  { code: "7.4", nom: "Physical security monitoring", domaine: "Contrôles physiques", theme: "Surveillance" },
  { code: "7.5", nom: "Protecting against physical and environmental threats", domaine: "Contrôles physiques", theme: "Protection physique" },
  { code: "7.6", nom: "Working in secure areas", domaine: "Contrôles physiques", theme: "Protection physique" },
  { code: "7.7", nom: "Clear desk and clear screen", domaine: "Contrôles physiques", theme: "Protection physique" },
  { code: "7.8", nom: "Equipment siting and protection", domaine: "Contrôles physiques", theme: "Protection des équipements" },
  { code: "7.9", nom: "Security of assets off-premises", domaine: "Contrôles physiques", theme: "Actifs mobiles" },
  { code: "7.10", nom: "Storage media", domaine: "Contrôles physiques", theme: "Supports de stockage" },
  { code: "7.11", nom: "Supporting utilities", domaine: "Contrôles physiques", theme: "Infrastructures" },
  { code: "7.12", nom: "Cabling security", domaine: "Contrôles physiques", theme: "Câblage" },
  { code: "7.13", nom: "Equipment maintenance", domaine: "Contrôles physiques", theme: "Maintenance" },
  { code: "7.14", nom: "Secure disposal or re-use of equipment", domaine: "Contrôles physiques", theme: "Élimination" },

  // === 8. Contrôles technologiques (34) ===
  { code: "8.1", nom: "User endpoint devices", domaine: "Contrôles technologiques", theme: "Appareils utilisateurs" },
  { code: "8.2", nom: "Privileged access rights", domaine: "Contrôles technologiques", theme: "Gestion des accès" },
  { code: "8.3", nom: "Information access restriction", domaine: "Contrôles technologiques", theme: "Gestion des accès" },
  { code: "8.4", nom: "Access to source code", domaine: "Contrôles technologiques", theme: "Développement" },
  { code: "8.5", nom: "Secure authentication", domaine: "Contrôles technologiques", theme: "Authentification" },
  { code: "8.6", nom: "Capacity management", domaine: "Contrôles technologiques", theme: "Ressources" },
  { code: "8.7", nom: "Protection against malware", domaine: "Contrôles technologiques", theme: "Malware" },
  { code: "8.8", nom: "Management of technical vulnerabilities", domaine: "Contrôles technologiques", theme: "Gestion des vulnérabilités" },
  { code: "8.9", nom: "Configuration management", domaine: "Contrôles technologiques", theme: "Configuration" },
  { code: "8.10", nom: "Information deletion", domaine: "Contrôles technologiques", theme: "Suppression" },
  { code: "8.11", nom: "Data masking", domaine: "Contrôles technologiques", theme: "Protection des données" },
  { code: "8.12", nom: "Data leakage prevention", domaine: "Contrôles technologiques", theme: "Protection des données" },
  { code: "8.13", nom: "Information backup", domaine: "Contrôles technologiques", theme: "Sauvegarde" },
  { code: "8.14", nom: "Redundancy of information processing facilities", domaine: "Contrôles technologiques", theme: "Continuité" },
  { code: "8.15", nom: "Logging", domaine: "Contrôles technologiques", theme: "Journalisation" },
  { code: "8.16", nom: "Monitoring activities", domaine: "Contrôles technologiques", theme: "Surveillance" },
  { code: "8.17", nom: "Clock synchronization", domaine: "Contrôles technologiques", theme: "Journalisation" },
  { code: "8.18", nom: "Use of privileged utility programs", domaine: "Contrôles technologiques", theme: "Outils privilégiés" },
  { code: "8.19", nom: "Installation of software on operational systems", domaine: "Contrôles technologiques", theme: "Gestion des changements" },
  { code: "8.20", nom: "Networks security", domaine: "Contrôles technologiques", theme: "Réseaux" },
  { code: "8.21", nom: "Security of network services", domaine: "Contrôles technologiques", theme: "Réseaux" },
  { code: "8.22", nom: "Segregation of networks", domaine: "Contrôles technologiques", theme: "Réseaux" },
  { code: "8.23", nom: "Web filtering", domaine: "Contrôles technologiques", theme: "Filtrage" },
  { code: "8.24", nom: "Use of cryptography", domaine: "Contrôles technologiques", theme: "Cryptographie" },
  { code: "8.25", nom: "Secure development life cycle", domaine: "Contrôles technologiques", theme: "Développement sécurisé" },
  { code: "8.26", nom: "Application security requirements", domaine: "Contrôles technologiques", theme: "Développement sécurisé" },
  { code: "8.27", nom: "Secure system architecture and engineering principles", domaine: "Contrôles technologiques", theme: "Architecture" },
  { code: "8.28", nom: "Secure coding", domaine: "Contrôles technologiques", theme: "Développement sécurisé" },
  { code: "8.29", nom: "Security testing in development and acceptance", domaine: "Contrôles technologiques", theme: "Tests" },
  { code: "8.30", nom: "Outsourced development", domaine: "Contrôles technologiques", theme: "Développement" },
  { code: "8.31", nom: "Separation of development, test and production environments", domaine: "Contrôles technologiques", theme: "Environnements" },
  { code: "8.32", nom: "Change management", domaine: "Contrôles technologiques", theme: "Gestion des changements" },
  { code: "8.33", nom: "Test information", domaine: "Contrôles technologiques", theme: "Tests" },
  { code: "8.34", nom: "Protection of information systems during audit testing", domaine: "Contrôles technologiques", theme: "Tests & Audit" },
]

async function main() {
  console.log("🌱 Lancement du seed ISO 27001:2022 (93 contrôles)...")

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
        description: ctrl.nom, // Tu pourras enrichir plus tard
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