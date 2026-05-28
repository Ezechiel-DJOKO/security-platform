import { prisma } from './src/lib/prisma';

async function main() {
  const actif = await prisma.actif.create({
    data: {
      nom: "Serveur Production Web",
      adresseIP: "192.168.10.45",
      hostname: "web-prod-01",
      type: "SERVEUR",
      criticite: "CRITIQUE",
      localisation: "Cotonou - Datacenter",
    }
  });

  console.log("✅ Actif créé avec succès !");
  console.log("ID :", actif.id);
}

main()
  .catch(e => console.error(e))
  .finally(() => process.exit());
