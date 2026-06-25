// src/app/(dashboard)/dashboard/page.tsx
import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

import DashboardContent from '@/components/DashboardContent';
import DashboardTechnicien from '@/components/dashboard/DashboardTechnicien';
import DashboardAuditeur from '@/components/dashboard/DashboardAuditeur';
import DashboardSuperviseur from '@/components/dashboard/DashboardSuperviseur';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;

  return (
    <div className="p-6 lg:p-8 min-h-screen">
      {/* Supprimé : bg-slate-950 ici */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-96">
            <p className="text-slate-400">Chargement du tableau de bord...</p>
          </div>
        }
      >
        {role === 'TECHNICIEN' ? (
          <DashboardTechnicien />
        ) : role === 'AUDITEUR' ? (
          <DashboardAuditeur />
        ) : role === 'SUPERVISEUR' ? (
          <DashboardSuperviseur />
        ) : (
          <DashboardContent />
        )}
      </Suspense>
    </div>
  );
}