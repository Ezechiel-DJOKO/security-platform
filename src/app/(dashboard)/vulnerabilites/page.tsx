// src/app/(dashboard)/vulnerabilites/page.tsx
import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Bug } from 'lucide-react';
import Link from 'next/link'; // Importation ajoutée pour la redirection

// Import des composants Admin existants
import { VulnerabilityStats } from '@/components/vulnerabilites/VulnerabilityStats';
import { VulnerabilitiesTable } from '@/components/vulnerabilites/VulnerabilitiesTable';

export default async function VulnerabilitesPage() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role as string;

  const isTechnicien = role === 'TECHNICIEN';

  return (
    <div className="space-y-8">
      {/* En-tête dynamique selon le rôle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-500/10 rounded-2xl">
            <Bug className="h-8 w-8 text-red-400" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white">
              {isTechnicien ? 'Mes Vulnérabilités Assignées' : 'Vulnérabilités'}
            </h1>
            <p className="text-slate-400 mt-1">
              {isTechnicien 
                ? 'Vulnérabilités qui vous sont assignées pour correction' 
                : 'Liste et suivi complet des vulnérabilités détectées'}
            </p>
          </div>
        </div>

        {/* Correction : Remplacement du bouton interactif par un Link */}
        {!isTechnicien && (
          <Link
            href="/scans"
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition inline-block text-center"
          >
            Aller aux Scans
          </Link>
        )}
      </div>

      <Suspense fallback={<div className="py-20 text-center text-slate-400">Chargement des données...</div>}>
        
          <>
            <VulnerabilityStats/>
            <VulnerabilitiesTable/>
          </>
        
      </Suspense>
    </div>
  );
}
