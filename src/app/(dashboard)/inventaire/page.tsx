import { Suspense } from 'react';
import { RoleGate } from '@/components/RoleGate';
import InventaireContent from '@/components/InventaireContent';

export const dynamic = 'force-dynamic';

export default function InventairePage() {
  return (
    <RoleGate 
      allowedRoles={['ADMIN', 'AUDITEUR']}
      // fallback optionnel si tu veux un message personnalisé
    >
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-96">
            <p className="text-slate-400">Chargement du module inventaire...</p>
          </div>
        }
      >
        <InventaireContent />
      </Suspense>
    </RoleGate>
  );
}