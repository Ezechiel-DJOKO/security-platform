import { Suspense } from 'react';
import DashboardContent from '@/components/DashboardContent';

// Indique à Next.js de ne pas pré-rendre cette page lors de la phase de build
export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  return (
    <Suspense 
      fallback={
        <div className="flex items-center justify-center h-96">
          <p className="text-slate-400">Chargement du tableau de bord...</p>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
