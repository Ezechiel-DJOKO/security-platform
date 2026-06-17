'use client';
import { Suspense, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import PlansCorrectionTable from '@/components/plans-correction/PlansCorrectionTable';
import StatsPlans from '@/components/plans-correction/StatsPlans';
import { Button } from '@/components/ui/button';
import { RoleGate } from '@/components/RoleGate';
import NewPlanModal from '@/components/plans-correction/NewPlanModal';
import toast from 'react-hot-toast';

export default function PlansCorrectionPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const refreshData = () => {
    setRefreshKey(prev => prev + 1);
    toast.success("Tableau rafraîchi");
  };

  const handleCreatePlan = async (data: any) => {
    try {
      const res = await fetch('/api/plans-correction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        toast.success('✅ Plan de correction créé avec succès !');
        setIsModalOpen(false);
        refreshData();
      } else {
        const error = await res.json();
        toast.error(error.error || '❌ Erreur lors de la création');
      }
    } catch (error) {
      console.error(error);
      toast.error('Erreur réseau');
    }
  };

  return (
    <RoleGate allowedRoles={['ADMIN', 'SUPERVISEUR', 'AUDITEUR']}>
      <div className="p-6 space-y-8">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-white">Plans de Correction</h1>
            <p className="text-slate-400 mt-2">
              Suivi et gestion des actions de remédiation des vulnérabilités
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={refreshData} className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Rafraîchir
            </Button>

            <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Nouveau Plan
            </Button>
          </div>
        </div>

        {/* Statistiques */}
        <Suspense fallback={<div className="h-32 bg-slate-900 rounded-2xl animate-pulse" />}>
          <StatsPlans />
        </Suspense>

        {/* Filtres */}
        <div className="flex gap-4 items-center bg-slate-950 border border-slate-800 rounded-xl p-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Rechercher une vulnérabilité ou CVE..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">Tous les statuts</option>
            <option value="A_FAIRE">À faire</option>
            <option value="EN_COURS">En cours</option>
            <option value="TERMINE">Terminé</option>
            <option value="VERIFIE">Vérifié</option>
            <option value="ANNULE">Annulé</option>
            <option value="EN_RETARD">En retard</option>
          </select>
        </div>

        {/* Tableau des plans */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-800">
            <h2 className="text-xl font-semibold">Liste des Plans de Correction</h2>
          </div>

          <Suspense fallback={
            <div className="p-12 text-center text-slate-400">Chargement des plans...</div>
          }>
            <PlansCorrectionTable 
              key={refreshKey} 
              filterStatus={filterStatus}
              searchTerm={searchTerm}
            />
          </Suspense>
        </div>

        {/* Modal de création */}
        <NewPlanModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleCreatePlan}
        />
      </div>
    </RoleGate>
  );
}