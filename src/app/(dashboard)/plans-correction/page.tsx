'use client';
import { useState } from 'react';
import StatsPlans from '@/components/plans-correction/StatsPlans';
import PlansCorrectionTable from '@/components/plans-correction/PlansCorrectionTable';
import { Button } from '@/components/ui/button';
import { Plus, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function PlansCorrectionPage() {
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleStatChange = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="space-y-8 p-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Plans de Correction</h1>
          <p className="text-slate-400 mt-2">
            Suivi et gestion des plans de correction des vulnérabilités
          </p>
        </div>
        
        <Button className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Nouveau Plan
        </Button>
      </div>

      {/* Statistiques */}
      <StatsPlans onRefresh={handleStatChange} key={refreshTrigger} />

      {/* Filtres */}
      <div className="flex flex-col md:flex-row gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 text-slate-500" />
          <Input
            placeholder="Rechercher une vulnérabilité..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-slate-950 border-slate-700"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
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

      {/* Tableau */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <PlansCorrectionTable
          filterStatus={filterStatus}
          searchTerm={searchTerm}
          onStatChange={handleStatChange}
        />
      </div>
    </div>
  );
}