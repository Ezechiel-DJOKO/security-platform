'use client';
import { useState, useEffect } from 'react';
import { AlertTriangle, TrendingUp, Database, RefreshCw } from 'lucide-react';
import { useSession } from 'next-auth/react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid
} from 'recharts';
import KPICards from "@/components/dashboard/KPICards";

// Type exact qui correspond à KPICards
type KPIData = {
  totalVulnerabilites: number;
  vulnsCritiques: number;
  vulnsCorrigees: number;
  pourcentageCritiquesResolus: number;
  delaiMoyenCorrection: number;
  scoreISO27001: number;
  lastUpdated: Date;
  cvssDistribution?: Array<{ name: string; value: number; color: string }>;
  temporalTrends?: Array<{ mois: string; vulns: number; scoreMoyen: number }>;
};

export default function DashboardContent() {
  const { data: session, status } = useSession();
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchKPIs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await fetch('/api/kpis', { cache: 'no-store' });
      const result = await res.json();
      
      if (result.success && result.data) {
        setKpis(result.data);
      } else {
        setError(result.error || "Erreur lors du chargement des KPIs");
      }
    } catch (err) {
      console.error(err);
      setError("Impossible de charger les données du tableau de bord");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (session) fetchKPIs();
  }, [session]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchKPIs();
  };

  if (status === "loading" || (loading && !kpis)) {
    return <div className="flex items-center justify-center h-96 text-slate-400">Chargement du tableau de bord...</div>;
  }

  if (!session) {
    return <div className="text-center py-12 text-amber-500">Vous devez être connecté...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-950/50 border border-red-900 p-8 rounded-3xl text-red-400 text-center">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
        <p className="text-xl">{error}</p>
        <button 
          onClick={handleRefresh}
          className="mt-4 px-6 py-2 bg-red-900 hover:bg-red-800 rounded-xl text-white"
        >
          Réessayer
        </button>
      </div>
    );
  }

  // Valeurs par défaut sécurisées
  const safeKpis: KPIData = kpis || {
    totalVulnerabilites: 0,
    vulnsCritiques: 0,
    vulnsCorrigees: 0,
    pourcentageCritiquesResolus: 0,
    delaiMoyenCorrection: 0,
    scoreISO27001: 0,
    lastUpdated: new Date(),
    cvssDistribution: [],
    temporalTrends: []
  };

  if (safeKpis.totalVulnerabilites === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-slate-400">
        <Database className="h-16 w-16 mb-4 opacity-50" />
        <p className="text-xl font-medium">Aucune donnée disponible</p>
        <p className="mt-2 text-sm">Lance un scan pour commencer</p>
        <button 
          onClick={handleRefresh}
          className="mt-6 flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-2xl text-white"
        >
          <RefreshCw className="w-5 h-5" />
          Actualiser
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Tableau de Bord</h1>
          <p className="text-slate-400 mt-2">
            Vue d’ensemble de la sécurité de{' '}
            <span className="text-emerald-400 font-semibold">{session.user?.name}</span>
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-2xl text-slate-300 disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      <KPICards kpis={safeKpis} isLoading={loading} />

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-400" />
            Distribution des Scores CVSS
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={safeKpis.cvssDistribution || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  dataKey="value"
                >
                  {(safeKpis.cvssDistribution || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
            Tendances Temporelles
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={safeKpis.temporalTrends || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="mois" stroke="#64748b" />
                <YAxis yAxisId="left" stroke="#64748b" />
                <YAxis yAxisId="right" orientation="right" stroke="#22c55e" />
                <Tooltip />
                <Line yAxisId="left" type="monotone" dataKey="vulns" stroke="#3b82f6" strokeWidth={3} />
                <Line yAxisId="right" type="monotone" dataKey="scoreMoyen" stroke="#22c55e" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}