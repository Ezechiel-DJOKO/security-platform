import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { RoleUtilisateur } from "@prisma/client";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import type { JWT } from "next-auth/jwt";
import type { User } from "next-auth";
import { logAuth } from "./audit";

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
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.utilisateur.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.actif) return null;

        const isValid = await bcrypt.compare(
          credentials.password,
          user.motDePasseHashe
        );

        if (!isValid) return null;

        // Log connexion réussie
        const ip = req.headers?.["x-forwarded-for"]?.toString() || req.headers?.["x-real-ip"]?.toString();
        const ua = req.headers?.["user-agent"]?.toString();
        await logAuth(user.id, "CONNEXION", ip, ua);

        return {
          id: user.id,
          email: user.email,
          name: `${user.prenom} ${user.nom}`,
          role: user.role,
        };
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
    async signOut({ token }: { token: JWT }) {
      // Log déconnexion
      if (token?.id) {
        await logAuth(token.id as string, "DECONNEXION");
      }
      return true;
    },
  },
};

// Pour les pages serveur (NextAuth v4)
export const auth = () => {
  const { getServerSession } = require("next-auth");
  return getServerSession(authOptions);
};

export default NextAuth(authOptions);

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: RoleUtilisateur;
      email: string;
      name?: string | null;
      image?: string | null;
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