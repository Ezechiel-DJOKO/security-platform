import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ✅ Indique à Turbopack d'exclure Prisma de la compilation côté client
  serverExternalPackages: ["@prisma/client"], 
};

export default nextConfig;
