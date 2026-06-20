// prisma/seed-iso27001.ts
import { prisma } from '@/lib/prisma'

const isoControls = [
  // === Colle ici tout ton tableau isoControls (je mets juste le début pour l'exemple) ===
  { code: "5.1", nom: "Policies for information security", domaine: "Contrôles organisationnels", theme: "Gouvernance" },
  { code: "5.2", nom: "Information security roles and responsibilities", domaine: "Contrôles organisationnels", theme: "Gouvernance" },
  { code: "5.3", nom: "Segregation of duties", domaine: "Contrôles organisationnels", theme: "Gouvernance" },
  // ... Colle le reste de tes 93 contrôles ici ...
]

async function main() {
  console.log("🌱 Lancement du seed ISO 27001:2022 (93 contrôles)...")
  let count = 0
  let errors = 0

  for (const ctrl of isoControls) {
    try {
      await prisma.controlConformite.upsert({
        where: {
          referentiel_code: {           // ← Clé composée (la bonne façon)
            referentiel: "ISO27001",
            code: ctrl.code,
          },
        },
        update: {},
        create: {
          referentiel: "ISO27001",
          code: ctrl.code,
          nom: ctrl.nom,
          description: ctrl.nom,
          domaine: ctrl.domaine,
          theme: ctrl.theme || "Autres",
          statut: "NON_EVALUE",
        },
      })
      count++
    } catch (e) {
      console.error(`❌ Erreur avec ${ctrl.code}:`, e)
      errors++
    }
  }

  console.log(`✅ Seed terminé ! ${count} contrôles insérés. Erreurs: ${errors}`)
}

main()
  .catch((e) => console.error("Erreur pendant le seed :", e))
  .finally(async () => {
    await prisma.$disconnect()
  })