import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import bcrypt from "bcryptjs";
import { RoleUtilisateur } from "@prisma/client";
import { prisma } from "./prisma";

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60,
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
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
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      if (account && !token.role) {
        const dbUser = await prisma.utilisateur.findUnique({
          where: { email: token.email! },
          select: { role: true },
        });
        token.role = dbUser?.role ?? RoleUtilisateur.AUDITEUR;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as RoleUtilisateur;
      }
      return session;
    },
    async signIn({ user, account }) {
      if (account?.type === "oauth") {
        const existing = await prisma.utilisateur.findUnique({
          where: { email: user.email! },
        });
        if (!existing) {
          await prisma.utilisateur.create({
            data: {
              email: user.email!,
              nom: user.name?.split(" ").pop() || "OAuth",
              prenom: user.name?.split(" ")[0] || "User",
              motDePasseHashe: "",
              role: RoleUtilisateur.AUDITEUR,
              actif: true,
            },
          });
        }
      }
      return true;
    },
  },
});

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