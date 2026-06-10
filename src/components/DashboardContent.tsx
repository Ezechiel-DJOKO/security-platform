'use client';
import { useState, useEffect } from 'react';
import { AlertTriangle, TrendingUp, Database } from 'lucide-react';
import { useSession } from 'next-auth/react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid
} from 'recharts';
import KpiCards from "@/components/dashboard/KPICards";

export default function DashboardContent() {
  const { data: session, status } = useSession();
  const [kpis, setKpis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchKPIs = async () => {
      try {
        const res = await fetch('/api/kpis');
        const result = await res.json();

        if (result.success) {
          setKpis(result.data);
        } else {
          setError(result.error || "Erreur lors du chargement des données");
        }
      } catch (err) {
        console.error(err);
        setError("Impossible de charger les KPIs");
      } finally {
        setLoading(false);
      }
    };

    fetchKPIs();
  }, []);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-96 text-slate-400">
        Chargement du tableau de bord...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-12 text-amber-500">
        Vous devez être connecté pour accéder au tableau de bord.
      </div>
    );
  }

  // Aucun donnée dans la base
  if (!error && (!kpis || kpis.totalVulns === 0)) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-slate-400">
        <Database className="h-16 w-16 mb-4 opacity-50" />
        <p className="text-xl font-medium">Aucune vulnérabilité trouvée</p>
        <p className="mt-2 text-sm">Ajoute des données de test pour voir les graphiques</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-950/50 border border-red-900 p-6 rounded-3xl text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Tableau de Bord</h1>
        <p className="text-slate-400 mt-2">
          Vue d’ensemble de la sécurité de{' '}
          <span className="text-emerald-400 font-semibold">
            {session.user?.name || "l'organisation"}
          </span>
        </p>
      </div>

      <KpiCards kpis={kpis} isLoading={loading} />

      {/* Graphiques Dynamiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Distribution CVSS */}
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-400" />
            Distribution des Scores CVSS
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={kpis.cvssDistribution || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  dataKey="value"
                >
                  {(kpis.cvssDistribution || []).map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tendances Temporelles */}
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
            Tendances Temporelles
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={kpis.temporalTrends || []}>
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