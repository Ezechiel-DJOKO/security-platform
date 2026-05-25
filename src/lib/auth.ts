import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { RoleUtilisateur } from "@prisma/client";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import type { JWT } from "next-auth/jwt";
import type { User } from "next-auth";
import { logAuditEvent as logAuth } from "./audit";

export const authOptions = {
  session: {
    strategy: "jwt" as const,
    maxAge: 24 * 60 * 60,
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      // Typage de req en 'any' pour éviter les conflits de types sur les en-têtes (headers)
      async authorize(credentials, req: any) {
        try {
          if (!credentials?.email || !credentials?.password) {
            console.log("❌ Credentials manquants");
            return null;
          }

          const user = await prisma.utilisateur.findUnique({
            where: { email: credentials.email as string },
          });

          if (!user) {
            console.log("❌ Utilisateur non trouvé :", credentials.email);
            return null;
          }

          if (!user.actif) {
            console.log("❌ Compte inactif :", credentials.email);
            return null;
          }

          const isValid = await bcrypt.compare(
            credentials.password as string,
            user.motDePasseHashe
          );

          if (!isValid) {
            console.log("❌ Mot de passe incorrect pour :", credentials.email);
            return null;
          }

          console.log("✅ Connexion réussie :", user.email);

          // === Log Audit ===
          try {
            // Extraction sécurisée de l'adresse IP depuis les en-têtes de la requête
            const ip = 
              req.headers?.["x-forwarded-for"]?.toString().split(",")[0] ||
              req.headers?.["x-real-ip"]?.toString() ||
              undefined;

            const ua = req.headers?.["user-agent"]?.toString();

            await logAuth(user.id, "CONNEXION", ip, ua);
          } catch (auditError) {
            console.error("⚠️ Erreur lors du log audit (non bloquante):", auditError);
          }

          return {
            id: user.id,
            email: user.email,
            name: `${user.prenom} ${user.nom}`,
            role: user.role,
          };
        } catch (error) {
          console.error("🚨 Erreur grave dans authorize():", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: JWT; user: User | null }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },

    async session({ session, token }: { session: any; token: JWT }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as RoleUtilisateur;
      }
      return session;
    },
  },
};

// Version moderne de l'export utilitaire pour les Server Components
export const auth = () => {
  const { getServerSession } = require("next-auth/next");
  return getServerSession(authOptions);
};

export default NextAuth(authOptions);

// === Augmentation des modules de types (Module Augmentation) ===
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
