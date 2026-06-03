import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "pg"], // <-- Ajoutez "pg" ici
};

export default nextConfig;
