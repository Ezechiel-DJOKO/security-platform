'use client';
import { TrendingUp, Clock, Target, AlertTriangle, Shield } from "lucide-react";

interface KpiCardsProps {
  kpis: {
    totalVulnerabilites: number;
    vulnsCritiques: number;
    vulnsCorrigees: number;
    pourcentageCritiquesResolus: number;
    delaiMoyenCorrection: number;
    scoreISO27001: number;
    lastUpdated?: Date;
  };
  isLoading?: boolean;
}

export default function KPICards({ kpis, isLoading = false }: KpiCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-slate-950 border border-slate-800 rounded-3xl p-6 animate-pulse"
          >
            <div className="h-4 bg-slate-800 rounded w-3/4 mb-4"></div>
            <div className="h-10 bg-slate-800 rounded w-1/2 mb-3"></div>
            <div className="h-3 bg-slate-800 rounded w-1/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!kpis) {
    return (
      <div className="text-red-400 p-6 bg-red-950/30 border border-red-900 rounded-3xl">
        Erreur lors du chargement des indicateurs
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* KPI 1 - Total Vulnérabilités */}
      <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 hover:border-slate-700 transition-all group">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-slate-400 text-sm">Total Vulnérabilités</p>
            <p className="text-4xl font-bold mt-3 text-white">
              {kpis.totalVulnerabilites.toLocaleString()}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-900 text-orange-400 group-hover:scale-110 transition-transform">
            <AlertTriangle className="w-8 h-8" />
          </div>
        </div>
        <p className="text-emerald-400 text-sm mt-4 flex items-center gap-1">
          <span className="font-medium">{kpis.vulnsCritiques}</span> critiques
        </p>
      </div>

      {/* KPI 2 - % Critiques Résolues */}
      <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 hover:border-slate-700 transition-all group">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-slate-400 text-sm">% Critiques Résolues</p>
            <p className="text-4xl font-bold mt-3 text-emerald-400">
              {kpis.pourcentageCritiquesResolus}%
            </p>
            <p className="text-slate-500 text-sm mt-1">
              {kpis.vulnsCorrigees} / {kpis.vulnsCritiques}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-900 text-emerald-400 group-hover:scale-110 transition-transform">
            <TrendingUp className="w-8 h-8" />
          </div>
        </div>
      </div>

      {/* KPI 3 - Délai Moyen de Correction */}
      <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 hover:border-slate-700 transition-all group">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-slate-400 text-sm">Délai Moyen Correction</p>
            <p className="text-4xl font-bold mt-3 text-amber-400">
              {kpis.delaiMoyenCorrection}j
            </p>
            <p className="text-slate-500 text-sm mt-1">MTTR</p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-900 text-amber-400 group-hover:scale-110 transition-transform">
            <Clock className="w-8 h-8" />
          </div>
        </div>
      </div>

      {/* KPI 4 - Score ISO 27001 */}
      <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 hover:border-slate-700 transition-all group">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-slate-400 text-sm">Conformité ISO 27001</p>
            <p className="text-4xl font-bold mt-3 text-blue-400">
              {kpis.scoreISO27001}%
            </p>
            <p className="text-slate-500 text-sm mt-1">Global</p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-900 text-blue-400 group-hover:scale-110 transition-transform">
            <Shield className="w-8 h-8" />
          </div>
        </div>
      </div>
    </div>
  );
}