// src/components/dashboard/KpiCards.tsx
import { TrendingUp, Clock, Target } from "lucide-react";

interface KpiCardsProps {
  kpis: {
    pourcentageCritiquesResolus: number;
    delaiMoyenCorrection: number;
    scoreISO27001: number;
    totalVulnerabilites: number;
    vulnsCritiques: number;
    vulnsCorrigees: number;
    lastUpdated: Date;
  } | null;
  isLoading?: boolean;
}

export default function KpiCards({ kpis, isLoading = false }: KpiCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Tu peux utiliser tes skeletons ici */}
        <div className="bg-gray-950 border border-gray-800 rounded-3xl p-6">Chargement...</div>
        <div className="bg-gray-950 border border-gray-800 rounded-3xl p-6">Chargement...</div>
        <div className="bg-gray-950 border border-gray-800 rounded-3xl p-6">Chargement...</div>
      </div>
    );
  }

  if (!kpis) {
    return <div className="text-red-500 p-4 bg-red-950/30 rounded-2xl">Erreur lors du chargement des KPIs</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* KPI 1 */}
      <div className="bg-gray-950 border border-gray-800 rounded-2xl p-6 hover:border-gray-700 transition-all">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">% Vulnérabilités Critiques Résolues</p>
            <p className="text-4xl font-bold mt-2 text-green-400">{kpis.pourcentageCritiquesResolus}%</p>
            <p className="text-gray-500 text-sm mt-1">
              {kpis.vulnsCorrigees}/{kpis.vulnsCritiques} critiques
            </p>
          </div>
          <div className="p-3 rounded-xl bg-gray-900 text-green-400">
            <TrendingUp className="w-8 h-8" />
          </div>
        </div>
      </div>

      {/* KPI 2 */}
      <div className="bg-gray-950 border border-gray-800 rounded-2xl p-6 hover:border-gray-700 transition-all">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">Délai Moyen de Correction</p>
            <p className="text-4xl font-bold mt-2 text-yellow-400">{kpis.delaiMoyenCorrection} jours</p>
            <p className="text-gray-500 text-sm mt-1">MTTR</p>
          </div>
          <div className="p-3 rounded-xl bg-gray-900 text-yellow-400">
            <Clock className="w-8 h-8" />
          </div>
        </div>
      </div>

      {/* KPI 3 */}
      <div className="bg-gray-950 border border-gray-800 rounded-2xl p-6 hover:border-gray-700 transition-all">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">Score Conformité ISO 27001</p>
            <p className="text-4xl font-bold mt-2 text-blue-400">{kpis.scoreISO27001}%</p>
            <p className="text-gray-500 text-sm mt-1">Global</p>
          </div>
          <div className="p-3 rounded-xl bg-gray-900 text-blue-400">
            <Target className="w-8 h-8" />
          </div>
        </div>
      </div>
    </div>
  );
}