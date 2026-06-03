import { RoleUtilisateur } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth";
import type { Session } from "next-auth";

// Type étendu pour l'utilisateur authentifié
interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: RoleUtilisateur;
}

export const ROLES_HIERARCHY: Record<RoleUtilisateur, number> = {
  [RoleUtilisateur.AUDITEUR]: 1,
  [RoleUtilisateur.SUPERVISEUR]: 2,
  [RoleUtilisateur.ADMIN]: 3,
};

export function hasRole(
  userRole: RoleUtilisateur,
  requiredRole: RoleUtilisateur
): boolean {
  return ROLES_HIERARCHY[userRole] >= ROLES_HIERARCHY[requiredRole];
}

export function isAdmin(role: RoleUtilisateur): boolean {
  return role === RoleUtilisateur.ADMIN;
}

export function isSuperviseurOrAbove(role: RoleUtilisateur): boolean {
  return ROLES_HIERARCHY[role] >= ROLES_HIERARCHY[RoleUtilisateur.SUPERVISEUR];
}

// Type guard pour vérifier que la session a un utilisateur authentifié
function isAuthenticated(session: Session | null): session is Session & { user: AuthenticatedUser } {
  return !!session?.user && 'role' in session.user && 'id' in session.user;
}

export async function requireRole(requiredRole: RoleUtilisateur) {
  const session = await getServerSession(authOptions);
  
  if (!isAuthenticated(session)) {
    throw new Error("Non authentifié");
  }

  if (!hasRole(session.user.role, requiredRole)) {
    throw new Error("Accès refusé");
  }

  return session;
}