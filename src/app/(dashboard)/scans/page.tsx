// src/app/scans/page.tsx
import GestionnaireScanCard from '@/components/scans/GestionnaireScanCard';
import { prisma } from '@/lib/prisma';
 

export default async function ScansPage() {
  // 1. Récupération des actifs depuis PostgreSQL (Server-side)
  const actifs = await prisma.actif.findMany({
    include: {
      scans: {
        orderBy: { debut: 'desc' },
        take: 1, // On récupère le dernier scan pour voir s'il est en cours
      }
    }
  });

  return (
    <main className="p-8 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Tableau de bord des Scans</h1>

      <div className="grid gap-4 md:grid-cols-2">
        {actifs.map((actif) => {
          const dernierScan = actif.scans[0];
          const estEnCours = dernierScan?.statut === 'EN_COURS' || dernierScan?.statut === 'PLANIFIE';

          return (
            <div key={actif.id} className="p-6 border rounded-xl shadow-sm space-y-4 bg-white">
              <div>
                <h2 className="font-semibold text-lg">{actif.nom || "Actif sans nom"}</h2>
                <p className="text-sm text-gray-500">{actif.adresseIP || actif.hostname}</p>
              </div>

              {/* 2. ON INJECTE LE COMPOSANT DU POINT 2 ICI 👇 */}
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
