import { Suspense } from 'react';
import RapportsContent from '@/components/RapportsContent';

// Coupe le pré-rendu statique au build pour cette route sous Next.js 16 / Turbopack
export const dynamic = 'force-dynamic';

export default function RapportsPage() {
  return (
    <Suspense 
      fallback={
        <div className="flex items-center justify-center h-96">
          <p className="text-slate-400">Chargement du module de rapports de sécurité...</p>
        </div>
      }
    >
      <RapportsContent />
    </Suspense>
  );
}
