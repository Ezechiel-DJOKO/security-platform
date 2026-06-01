import "dotenv/config";
import { defineConfig, env } from "@prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx ./seed.ts", // Configuration moderne du seed Prisma 7
  },
  datasource: {
    url: env("DATABASE_URL"), // La variable d'environnement est injectée de manière sécurisée ici
  },
});
