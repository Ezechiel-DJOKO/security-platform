'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  ClipboardList, Clock, CheckCircle, Eye, XCircle, AlertTriangle
} from 'lucide-react';

interface Stats {
  total: number;
  enRetard: number;
  urgent: number;
  aFaire: number;
  enCours: number;
  termine: number;
  verifie?: number;   // Ajout
}

interface StatsPlansProps {
  refreshTrigger?: number;
}

const STAT_CARDS = [
  { key: 'total', label: "Total", color: "text-white", icon: ClipboardList },
  { key: 'aFaire', label: "À faire", color: "text-slate-400", icon: ClipboardList },
  { key: 'enCours', label: "En cours", color: "text-blue-400", icon: Clock },
  { key: 'termine', label: "Terminés", color: "text-green-400", icon: CheckCircle },
  { key: 'verifie', label: "Vérifiés", color: "text-emerald-400", icon: Eye },
  { key: 'enRetard', label: "En retard", color: "text-red-400", icon: AlertTriangle },
] as const;

export default function StatsPlans({ refreshTrigger = 0 }: StatsPlansProps) {
  const [stats, setStats] = useState<Stats>({
    total: 0, enRetard: 0, urgent: 0, aFaire: 0, enCours: 0, termine: 0, verifie: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/plans-correction');
      if (res.ok) {
        const result = await res.json();
        const backendStats = result.stats || {};

        setStats({
          total: backendStats.total || 0,
          enRetard: backendStats.enRetard || 0,
          urgent: backendStats.urgent || 0,
          aFaire: backendStats.aFaire || 0,
          enCours: backendStats.enCours || 0,
          termine: backendStats.termine || 0,
          verifie: backendStats.verifie || 0,   // ← Ajout
        });
      }
    } catch (error) {
      console.error("Erreur stats:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats, refreshTrigger]);

  if (loading) {
    return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 animate-pulse">...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {STAT_CARDS.map((card) => {
        const Icon = card.icon;
        const value = stats[card.key as keyof Stats] ?? 0;
        return (
          <div key={card.key} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">{card.label}</p>
                <p className="text-4xl font-bold text-white mt-3">{value}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/50">
                <Icon className={`w-9 h-9 ${card.color}`} strokeWidth={2} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}