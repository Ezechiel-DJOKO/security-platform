import { Suspense } from 'react';
import { RoleGate } from '@/components/RoleGate';
import GestionnaireScanCard from '@/components/scans/GestionnaireScanCard';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function ScansPage() {
  const actifs = await prisma.actif.findMany({
    include: {
      scans: {
        orderBy: { debut: 'desc' },
        take: 1,
      },
    },
    orderBy: { nom: 'asc' },
  });

  return (
    <RoleGate allowedRoles={['ADMIN', 'AUDITEUR', 'SUPERVISEUR']}>
      <div className="p-8 w-full min-h-screen bg-slate-950">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Gestion des Scans</h1>
            <p className="text-slate-400 mt-2">
              Surveillance et lancement de scans de sécurité
            </p>
          </div>
          <div className="text-sm text-slate-400">
            {actifs.length} actif{actifs.length > 1 ? 's' : ''} inventorié{actifs.length > 1 ? 's' : ''}
          </div>
        </div>

        {actifs.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            Aucun actif trouvé. Veuillez en ajouter dans l'inventaire.
          </div>
        ) : (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {actifs.map((actif) => {
              const dernierScan = actif.scans[0];
              const estEnCours = dernierScan?.statut === 'EN_COURS' || dernierScan?.statut === 'PLANIFIE';

              return (
                <div
                  key={actif.id}
                  className="p-6 border border-slate-800 rounded-2xl bg-slate-900 hover:border-slate-700 transition-all duration-200"
                >
                  <div className="mb-5">
                    <h2 className="font-semibold text-lg text-slate-100">{actif.nom}</h2>
                    <p className="text-sm text-slate-400 mt-1">
                      {actif.adresseIP || actif.hostname}
                    </p>
                  </div>

                  <Suspense fallback={<div className="h-32 bg-slate-800 rounded-xl animate-pulse" />}>
                    <GestionnaireScanCard
                      idActif={actif.id}
                      scanIdEnCours={estEnCours ? dernierScan?.id : undefined}
                    />
                  </Suspense>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </RoleGate>
  );
}