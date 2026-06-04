// src/app/scans/page.tsx
export const dynamic = 'force-dynamic';

import GestionnaireScanCard from '@/components/scans/GestionnaireScanCard';
import { prisma } from '@/lib/prisma';

export default async function ScansPage() {
  const actifs = await prisma.actif.findMany({
    include: {
      scans: {
        orderBy: { debut: 'desc' },
        take: 1,
      }
    }
  });

  return (
    <main className="p-8 w-full min-h-screen bg-slate-950">
      <h1 className="text-2xl font-bold text-slate-50 mb-6">Tableau de bord des Scans</h1>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {actifs.map((actif) => {
          const dernierScan = actif.scans[0];
          const estEnCours = dernierScan?.statut === 'EN_COURS' || dernierScan?.statut === 'PLANIFIE';

          return (
            <div key={actif.id} className="p-6 border border-slate-800 rounded-xl shadow-lg space-y-4 bg-slate-900 hover:border-slate-700 transition-colors">
              <div>
                <h2 className="font-semibold text-lg text-slate-100">{actif.nom || "Actif sans nom"}</h2>
                <p className="text-sm text-slate-400">{actif.adresseIP || actif.hostname}</p>
              </div>

              <GestionnaireScanCard 
                idActif={actif.id} 
                scanIdEnCours={estEnCours ? dernierScan.id : undefined} 
              />
            </div>
          );
        })}
      </div>
    </main>
  );
}