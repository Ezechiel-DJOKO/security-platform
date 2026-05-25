import { Suspense } from 'react';
import InventaireContent from '@/components/InventaireContent';

// Ordonne formellement à Next.js de zapper le pré-rendu statique au build
export const dynamic = 'force-dynamic';

export default function InventairePage() {
  return (
    <Suspense 
      fallback={
        <div className="flex items-center justify-center h-96">
          <p className="text-slate-400">Chargement du module inventaire...</p>
        </div>
      }
    >
      <InventaireContent />
    </Suspense>
  );
}
