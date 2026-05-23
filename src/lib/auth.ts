import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { RoleUtilisateur } from "@prisma/client";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import type { JWT } from "next-auth/jwt";
import type { User } from "next-auth";

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
      async authorize(credentials) {
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
