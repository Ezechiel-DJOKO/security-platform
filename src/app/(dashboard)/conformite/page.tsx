import { Suspense } from 'react';
import ConformiteContent from '@/components/ConformiteContent';

// Cette ligne force Next.js à sauter le pré-rendu statique au build pour cette page
export const dynamic = 'force-dynamic';

export default function ConformitePage() {
  return (
    <Suspense 
      fallback={
        <div className="flex items-center justify-center h-96">
          <p className="text-slate-400">Chargement du module de conformité...</p>
        </div>
      }
    >
      <ConformiteContent />
    </Suspense>
  );
}
