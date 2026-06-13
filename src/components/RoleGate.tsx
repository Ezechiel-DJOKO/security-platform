'use client';
import { ReactNode } from 'react';
import { useSession } from 'next-auth/react';

interface RoleGateProps {
  children: ReactNode;
  allowedRoles: string[];
  fallback?: ReactNode;
  // Option pour masquer complètement au lieu d'afficher le message d'accès refusé
  silent?: boolean;
}

export function RoleGate({
  children,
  allowedRoles,
  fallback = null,
  silent = false,
}: RoleGateProps) {
  const { data: session, status } = useSession();

  // Chargement
  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-slate-400">Chargement des permissions...</div>
      </div>
    );
  }

  // Non authentifié
  if (!session?.user) {
    return <>{fallback}</>;
  }

  const userRole = session.user.role as string;

  // Accès autorisé
  if (allowedRoles.includes(userRole)) {
    return <>{children}</>;
  }

  // Accès refusé
  if (silent) {
    return null; // Ou un fallback discret
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-slate-400 px-4">
      <div className="text-7xl mb-6">🔒</div>
      <h3 className="text-2xl font-semibold text-white mb-3">Accès Refusé</h3>
      <p className="text-center max-w-md">
        Votre rôle (<span className="font-medium text-rose-400">{userRole}</span>) 
        ne permet pas d’accéder à cette section.
      </p>
      <p className="mt-2 text-sm text-slate-500">
        Rôles autorisés : <span className="font-medium text-slate-300">{allowedRoles.join(' • ')}</span>
      </p>
    </div>
  );
}