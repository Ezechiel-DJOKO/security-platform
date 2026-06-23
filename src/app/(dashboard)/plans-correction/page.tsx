// src/app/(dashboard)/plans-correction/page.tsx
'use client';

import { useState } from 'react';
import { Suspense } from 'react';
import { CheckSquare } from 'lucide-react';
import PlansCorrectionTechnicien from '@/components/dashboard/PlansCorrectionTechnicien';
import StatsPlans from '@/components/plans-correction/StatsPlans';
import PlansCorrectionTable from '@/components/plans-correction/PlansCorrectionTable';
import NewPlanModal from '@/components/plans-correction/NewPlanModal';

export default function PlansCorrectionPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // Pour rafraîchir le tableau

  // Rôle actuel (à remplacer plus tard par un vrai hook d'authentification)
  const [role] = useState<string>('ADMIN'); 
  const isTechnicien = role === 'TECHNICIEN';

  const handleSuccess = () => {
    setRefreshKey(prev => prev + 1); // Force le rechargement du tableau
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-2xl">
            <CheckSquare className="h-8 w-8 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white">
              {isTechnicien ? 'Mes Plans de Correction' : 'Plans de Correction'}
            </h1>
            <p className="text-slate-400 mt-2">
              {isTechnicien
                ? 'Suivi de mes corrections assignées'
                : 'Suivi et gestion des plans de correction des vulnérabilités'}
            </p>
          </div>
        </div>

        {!isTechnicien && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-medium transition"
          >
            <CheckSquare className="w-5 h-5" />
            Nouveau Plan
          </button>
        )}
      </div>

      <Suspense fallback={<div className="py-20 text-center text-slate-400">Chargement des plans de correction...</div>}>
        {isTechnicien ? (
          <PlansCorrectionTechnicien />
        ) : (
          <>
            <StatsPlans refreshTrigger={refreshKey} />
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <PlansCorrectionTable key={refreshKey} />
            </div>
          </>
        )}
      </Suspense>

      <NewPlanModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
      />
    </div>
  );
}