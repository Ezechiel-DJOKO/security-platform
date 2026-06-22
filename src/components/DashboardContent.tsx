'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { AlertTriangle, TrendingUp, Database, RefreshCw } from 'lucide-react';
import { useSession } from 'next-auth/react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid
} from 'recharts';

import KPICards from "@/components/dashboard/KPICards";

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

// Define proper error type
interface FetchError extends Error {
  message: string;
}

export default function DashboardContent() {
  const { data: session, status } = useSession();
  
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const isMountedRef = useRef(true);

  const fetchKPIs = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    try {
      setError(null);
      setRefreshing(true);
      
      const res = await fetch('/api/kpis', { 
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const result = await res.json();

      if (result.success && result.data) {
        // Only update state if component is still mounted
        if (isMountedRef.current) {
          setKpis(result.data);
          setLoading(false);
        }
      } else {
        throw new Error(result.error || "Erreur lors du chargement des KPIs");
      }
    } catch (err) {
      const fetchError = err as FetchError;
      console.error(fetchError);
      if (isMountedRef.current) {
        setError(fetchError.message || "Impossible de charger les données du tableau de bord");
        setLoading(false);
      }
    } finally {
      if (isMountedRef.current) {
        setRefreshing(false);
      }
    }
  }, []);

  // Chargement initial avec gestion du montage
  useEffect(() => {
    isMountedRef.current = true;
    
    const loadData = async () => {
      if (session?.user && isMountedRef.current) {
        await fetchKPIs();
      }
    };
    
    loadData();
    
    return () => {
      isMountedRef.current = false;
    };
  }, [session, fetchKPIs]);

  const handleRefresh = () => {
    fetchKPIs();
  };

  // États de chargement
  if (status === "loading" || (loading && !kpis)) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-400">
        Chargement du tableau de bord...
      </div>
    );
  }

  if (!session) {
    return <div className="text-center py-12 text-amber-500">Vous devez être connecté pour accéder au tableau de bord.</div>;
  }

  if (error) {
    return (
      <div className="bg-red-950/50 border border-red-900 p-8 rounded-3xl text-red-400 text-center">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
        <p className="text-xl mb-4">{error}</p>
        <button
          onClick={handleRefresh}
          className="px-6 py-2 bg-red-900 hover:bg-red-800 rounded-xl text-white transition-colors"
        >
          Réessayer
        </button>
      </div>
    );
  }

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
        <p className="text-xl font-medium">Aucune donnée disponible pour le moment</p>
        <p className="mt-2 text-sm">Lancez votre premier scan de sécurité</p>
        <button
          onClick={handleRefresh}
          className="mt-6 flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-2xl text-white transition-all"
        >
          <RefreshCw className="w-5 h-5" />
          Actualiser
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white">Tableau de Bord</h1>
          <p className="text-slate-400 mt-2">
            Vue d&apos;ensemble de la sécurité • 
            <span className="text-emerald-400 font-semibold ml-1">
              {session.user?.name || session.user?.email}
            </span>
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-2xl text-slate-300 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {/* KPIs */}
      <KPICards kpis={safeKpis} isLoading={loading} />

      {/* Graphiques Améliorés */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribution CVSS - Version plus belle */}
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-400" />
              Distribution des Scores CVSS
            </h3>
            <div className="text-xs text-slate-500">Total : {safeKpis.totalVulnerabilites}</div>
          </div>
          
          <div className="h-80 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={safeKpis.cvssDistribution || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={75}
                  outerRadius={115}
                  dataKey="value"
                  nameKey="name"
                  paddingAngle={3}
                >
                  {(safeKpis.cvssDistribution || []).map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color} 
                      stroke="#0f172a"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#1e2937',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#e2e8f0'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Légende personnalisée */}
          <div className="flex flex-wrap gap-4 mt-4 justify-center">
            {(safeKpis.cvssDistribution || []).map((entry, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-slate-400">{entry.name}</span>
                <span className="font-medium text-white">({entry.value})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tendances Temporelles - Version améliorée */}
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
              Évolution des Vulnérabilités
            </h3>
            <span className="text-xs px-3 py-1 bg-slate-900 rounded-full text-slate-400">6 derniers mois</span>
          </div>
          
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={safeKpis.temporalTrends || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis 
                  dataKey="mois" 
                  stroke="#64748b" 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                />
                <YAxis 
                  yAxisId="left" 
                  stroke="#64748b" 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  stroke="#22c55e" 
                  tick={{ fill: '#22c55e', fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#1e2937',
                    border: 'none',
                    borderRadius: '12px'
                  }}
                />
                <Line 
                  yAxisId="left" 
                  type="natural" 
                  dataKey="vulns" 
                  stroke="#3b82f6" 
                  strokeWidth={4}
                  dot={{ fill: '#3b82f6', r: 5 }}
                  activeDot={{ r: 7 }}
                  name="Vulnérabilités détectées"
                />
                <Line 
                  yAxisId="right" 
                  type="natural" 
                  dataKey="scoreMoyen" 
                  stroke="#22c55e" 
                  strokeWidth={3}
                  strokeDasharray="5 5"
                  name="Score Moyen CVSS"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}