'use client';

import { ReactNode } from 'react';
import { useSession } from 'next-auth/react';

interface RoleGateProps {
  children: ReactNode;
  allowedRoles: string[];        // ← Pluriel ici
  fallback?: ReactNode;
}

export function RoleGate({ children, allowedRoles, fallback = null }: RoleGateProps) {
  const { data: session, status } = useSession();

  // En cours de chargement
  if (status === 'loading') {
    return <div className="flex justify-center items-center h-64">Chargement...</div>;
  }

  // Non connecté
  if (!session?.user?.role) {
    return <>{fallback}</>;
  }

  const userRole = session.user.role as string;

  // Vérification des rôles autorisés
  if (!allowedRoles.includes(userRole)) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-slate-400">
        <div className="text-6xl mb-4">🔒</div>
        <h3 className="text-xl font-semibold mb-2">Accès refusé</h3>
        <p className="text-center max-w-md">
          Vous n'avez pas les permissions nécessaires pour accéder à cette section.<br />
          Rôle requis : {allowedRoles.join(' ou ')}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}