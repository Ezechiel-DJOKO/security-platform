import { RoleUtilisateur } from "@prisma/client";

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

export async function requireRole(role: RoleUtilisateur) {
  const { getServerSession } = await import("next-auth");
  const { authOptions } = await import("./auth");
  const session = await getServerSession(authOptions);
  if (
    !session?.user?.role ||
    !hasRole(session.user.role, role)
  ) {
    throw new Error("Unauthorized");
  }
  return session;
}
