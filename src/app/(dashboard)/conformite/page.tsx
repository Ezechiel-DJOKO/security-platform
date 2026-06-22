import { Suspense } from 'react';
import ConformiteContent from '@/components/ConformiteContent';
import { RoleGate } from '@/components/RoleGate';

export const dynamic = 'force-dynamic';

export default function ConformitePage() {
  return (
    <RoleGate allowedRoles={['ADMIN', 'AUDITEUR', 'SUPERVISEUR']}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Conformité ISO 27001</h1>
            <p className="text-slate-400 mt-2">
              Évaluation des contrôles et gap analysis
            </p>
          </div>
          
          {/* Bouton optionnel pour rafraîchir */}
          {/* <Button variant="outline" onClick={() => window.location.reload()}>
            Actualiser l'analyse
          </Button> */}
        </div>

        {/* Contenu principal */}
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-96">
              <p className="text-slate-400">Calcul de l&apos;analyse Gap ISO 27001 en cours...</p>
            </div>
          }
        >
          <ConformiteContent />
        </Suspense>
      </div>
    </RoleGate>
  );
}