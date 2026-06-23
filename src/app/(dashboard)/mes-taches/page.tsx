'use client';
import { Suspense } from 'react';
import MesTachesTechnicien from '@/components/dashboard/MesTachesTechnicien';
import { ShieldAlert } from 'lucide-react';

export default function MesTachesPage() {
  return (
    <div className="space-y-8">
      {/* En-tête de la page */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-orange-500/10 rounded-2xl">
            <ShieldAlert className="h-8 w-8 text-orange-400" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white">Mes Tâches</h1>
            <p className="text-slate-400 mt-1">
              Suivi et correction des vulnérabilités qui vous sont assignées
            </p>
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
      </div>

      {/* Contenu principal avec Suspense pour le loading */}
      <Suspense 
        fallback={
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin h-8 w-8 border-4 border-slate-700 border-t-blue-500 rounded-full mb-4" />
            <p className="text-slate-400">Chargement de vos tâches assignées...</p>
          </div>
        }
      >
        <MesTachesTechnicien />
      </Suspense>
    </div>
  );
}