import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import crypto from "crypto";
import { logAuditEvent as logAuth } from "./audit";

export type RoleUtilisateur = "ADMIN" | "SUPERVISEUR" | "AUDITEUR" | "TECHNICIEN";

// Solution anti-crash : Empêcher la duplication du pool de connexions sous Next.js (Fast Refresh)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

const pool = globalForPrisma.pool ?? new Pool({ connectionString: process.env.DATABASE_URL });
if (process.env.NODE_ENV !== "production") globalForPrisma.pool = pool;

const adapter = new PrismaPg(pool);
const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

function hashPasswordSimple(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60,
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials, req) {
        try {
          if (!credentials?.email || !credentials?.password) {
            return null;
          }

          const user = await prisma.utilisateur.findUnique({
            where: { email: credentials.email as string },
          });

          if (!user || !user.actif) {
            return null;
          }

          // CRYPTO SIMPLE : Hachage du mot de passe reçu du formulaire
          const hashSaisi = hashPasswordSimple(credentials.password as string);
          const isValid = hashSaisi === user.motDePasseHash;

          console.log("👉 MOT DE PASSE COMPARAISON :", {
            saisi: hashSaisi,
            enBase: user.motDePasseHash.substring(0, 30) + '...',
            valide: isValid
          });

          if (!isValid) {
            return null;
          }

          // Audit en tâche de fond (non bloquant)
          try {
            const ip = req?.headers?.["x-forwarded-for"]?.toString().split(",")[0] || "unknown";
            const ua = req?.headers?.["user-agent"]?.toString();
            logAuth(user.id, "CONNEXION", ip, ua).catch((err) =>
              console.error("Échec silencieux de l'audit :", err)
            );
          } catch (e) {
            console.warn("Audit non critique :", e);
          }

          return {
            id: user.id,
            email: user.email,
            name: `${user.prenom || ""} ${user.nom || ""}`.trim(),
            role: user.role as RoleUtilisateur,
          };
        } catch (error) {
          console.error("Erreur dans authorize():", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as RoleUtilisateur;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: RoleUtilisateur;
      email: string;
      name?: string | null;
    };
  }
  interface User {
    role: RoleUtilisateur;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: RoleUtilisateur;
  }
}
