import "dotenv/config";
import { defineConfig, env } from "@prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",

  datasource: {
    url: env("DATABASE_URL"),
  },

  migrations: {
    path: "prisma/migrations",
    // On utilise ./seed.ts car le fichier est à la racine
    // Et npx ts-node pour s'assurer que l'exécuteur est trouvé
    seed: "npx ts-node ./seed.ts", 
  },
});
