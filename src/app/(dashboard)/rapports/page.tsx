// src/app/(dashboard)/rapports/page.tsx
import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { FileText } from 'lucide-react';

import RapportsContent from '@/components/RapportsContent';           // Version Admin existante
import RapportsTechnicien from '@/components/dashboard/RapportsTechnicien';

export const dynamic = 'force-dynamic';

export default async function RapportsPage() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role as string;

  const isTechnicien = role === 'TECHNICIEN';

  return (
    <div className="space-y-8">
      {/* En-tête dynamique */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-purple-500/10 rounded-2xl">
          <FileText className="h-8 w-8 text-purple-400" />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-white">
            {isTechnicien ? 'Mes Rapports' : 'Rapports d\'Audit'}
          </h1>
          <p className="text-slate-400 mt-1">
            {isTechnicien 
              ? "Rapports liés à vos vulnérabilités et corrections" 
              : "Gestion et consultation des rapports de sécurité"}
          </p>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center h-96">
            <p className="text-slate-400">Chargement du module de rapports...</p>
          </div>
        }
      >
        {isTechnicien ? (
          <RapportsTechnicien />
        ) : (
          <RapportsContent />
        )}
      </Suspense>
    </div>
  );
}