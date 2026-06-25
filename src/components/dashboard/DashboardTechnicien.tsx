'use client';
import { useSession } from 'next-auth/react';
import { LayoutDashboard, CheckSquare, Bug, FileText } from 'lucide-react';

import StatsGenerales from './StatsGenerales';
import VulnerabilitesTechnicien from './VulnerabilitesTechnicien';
import MesTachesTechnicien from './MesTachesTechnicien';
import RapportsTechnicien from '../rapports/RapportsTechnicien';

export default function DashboardTechnicien() {
  const { data: session } = useSession();

  return (
    <div className="space-y-8">
      {/* En-tête Technicien */}
      <div className="flex items-center gap-4">
        <div className="p-4 bg-orange-500/10 rounded-2xl">
          <LayoutDashboard className="h-9 w-9 text-orange-400" />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-white">Mon Tableau de Bord</h1>
          <p className="text-slate-400 mt-1">
            Bienvenue {session?.user?.name || session?.user?.email?.split('@')[0] || 'Technicien'} 
            • Suivi de vos corrections
          </p>
        </div>
      </div>

      {/* Statistiques */}
      <StatsGenerales />

      {/* Contenu Principal */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Mes Tâches */}
        <div className="xl:col-span-7 bg-slate-950 border border-slate-800 rounded-3xl p-6 lg:p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold flex items-center gap-3">
              <CheckSquare className="text-emerald-400 h-6 w-6" />
              Mes Tâches de Correction
            </h2>
            <a href="/mes-taches" className="text-blue-400 hover:underline text-sm font-medium">
              Voir tout →
            </a>
          </div>
          <MesTachesTechnicien />
        </div>

        {/* Vulnérabilités Assignées */}
        <div className="xl:col-span-5 bg-slate-950 border border-slate-800 rounded-3xl p-6 lg:p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold flex items-center gap-3">
              <Bug className="text-red-400 h-6 w-6" />
              Vulnérabilités Assignées
            </h2>
            <a href="/vulnerabilites" className="text-blue-400 hover:underline text-sm font-medium">
              Voir tout →
            </a>
          </div>
          <VulnerabilitesTechnicien />
        </div>
      </div>

      {/* Derniers Rapports */}
      <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 lg:p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold flex items-center gap-3">
            <FileText className="text-purple-400 h-6 w-6" />
            Derniers Rapports
          </h2>
          <a href="/rapports" className="text-blue-400 hover:underline text-sm font-medium">
            Tous les rapports →
          </a>
        </div>
        <RapportsTechnicien />
      </div>
    </div>
  );
}