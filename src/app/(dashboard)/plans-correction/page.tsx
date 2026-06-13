'use client';

import { Suspense, useState } from 'react';
import { Plus } from 'lucide-react';
import PlansCorrectionTable from '@/components/plans-correction/PlansCorrectionTable';
import StatsPlans from '@/components/plans-correction/StatsPlans';
import { Button } from '@/components/ui/button';
import { RoleGate } from '@/components/RoleGate';
import NewPlanModal from '@/components/plans-correction/NewPlanModal';

export default function PlansCorrectionPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCreatePlan = async (data: any) => {
  try {
    const res = await fetch('/api/plans-correction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      alert('✅ Plan de correction créé avec succès !');
      // Recharger le tableau
      window.location.reload();
    } else {
      alert('❌ Erreur lors de la création');
    }
  } catch (error) {
    console.error(error);
    alert('Erreur réseau');
  }
};

  return (
    <RoleGate allowedRoles={['ADMIN', 'AUDITEUR', 'SUPERVISEUR']}>
      <div className="p-6 space-y-8">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-white">Plans de Correction</h1>
            <p className="text-slate-400 mt-2">
              Suivi et gestion des plans de remédiation des vulnérabilités
            </p>
          </div>

          <Button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nouveau Plan
          </Button>
        </div>

        {/* Statistiques */}
        <Suspense fallback={<div className="h-32 bg-slate-900 rounded-2xl animate-pulse" />}>
          <StatsPlans />
        </Suspense>

        {/* Tableau principal */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-800 flex justify-between items-center">
            <h2 className="text-xl font-semibold">Liste des Plans de Correction</h2>
            
            <div className="flex gap-3">
              <select className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500">
                <option value="">Tous les statuts</option>
                <option value="EN_COURS">En cours</option>
                <option value="A_VALIDER">À valider</option>
                <option value="TERMINE">Terminé</option>
                <option value="EN_RETARD">En retard</option>
              </select>

              <input
                type="text"
                placeholder="Rechercher une vulnérabilité..."
                className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm w-72 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <Suspense fallback={<div className="p-12 text-center text-slate-400">Chargement des plans...</div>}>
            <PlansCorrectionTable />
          </Suspense>
        </div>

        {/* Modale */}
        <NewPlanModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onSubmit={handleCreatePlan} 
        />
      </div>
    </RoleGate>
  );
}