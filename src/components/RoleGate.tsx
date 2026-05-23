"use client";

import { useSession } from "next-auth/react";
import { RoleUtilisateur } from "@prisma/client";
import { hasRole } from "@/lib/rbac";

interface RoleGateProps {
  children: React.ReactNode;
  allowedRole: RoleUtilisateur;
  fallback?: React.ReactNode;
}

export function RoleGate({ children, allowedRole, fallback = null }: RoleGateProps) {
  const { data: session } = useSession();
  const userRole = session?.user?.role;

  if (!userRole || !hasRole(userRole, allowedRole)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}