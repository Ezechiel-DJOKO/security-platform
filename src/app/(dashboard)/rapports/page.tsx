// src/app/(dashboard)/rapports/page.tsx
import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { FileText } from 'lucide-react';

import RapportsSuperviseur from '@/components/rapports/RapportsSuperviseur';
import RapportsAuditeur from '@/components/rapports/RapportsAuditeur';
import RapportsTechnicien from '@/components/rapports/RapportsTechnicien';
import RapportsAdmin from '@/components/rapports/RapportsAdmin';

export const dynamic = 'force-dynamic';

export default async function RapportsPage() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role as string;

  return (
    <div className="space-y-8 p-6 lg:p-8">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-purple-500/10 rounded-2xl">
          <FileText className="h-8 w-8 text-purple-400" />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-white">
            {role === 'TECHNICIEN' ? 'Mes Rapports' : 
             role === 'AUDITEUR' ? 'Rapports d\'Audit' :
             role === 'SUPERVISEUR' ? 'Rapports de Pilotage' : 
             'Rapports & Analyses'}
          </h1>
          <p className="text-slate-400 mt-1">
            {role === 'TECHNICIEN' 
              ? "Rapports liés à vos vulnérabilités et corrections"
              : "Analyse et suivi de la posture de sécurité"}
          </p>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center h-96">
            <p className="text-slate-400">Chargement des rapports...</p>
          </div>
        }
      >
        {role === 'TECHNICIEN' ? (
          <RapportsTechnicien />
        ) : role === 'AUDITEUR' ? (
          <RapportsAuditeur />
        ) : role === 'SUPERVISEUR' ? (
          <RapportsSuperviseur />
        ) : (
          <RapportsAdmin />   // Version complète avec graphiques
        )}
      </Suspense>
    </div>
  );
}