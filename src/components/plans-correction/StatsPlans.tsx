'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  ClipboardList, Clock, CheckCircle, Eye, XCircle, AlertTriangle
} from 'lucide-react';

type Stats = {
  TOTAL: number;
  A_FAIRE: number;
  EN_COURS: number;
  TERMINE: number;
  VERIFIE: number;
  ANNULE: number;
  EN_RETARD: number;
};

interface StatsPlansProps {
  refreshTrigger?: number;     // ← Changé pour plus de fiabilité
}

const STAT_CARDS = [
  { key: 'A_FAIRE', label: "À faire", color: "text-slate-400", icon: ClipboardList },
  { key: 'EN_COURS', label: "En cours", color: "text-blue-400", icon: Clock },
  { key: 'TERMINE', label: "Terminés", color: "text-green-400", icon: CheckCircle },
  { key: 'VERIFIE', label: "Vérifiés", color: "text-emerald-400", icon: Eye },
  { key: 'ANNULE', label: "Annulés", color: "text-gray-400", icon: XCircle },
  { key: 'EN_RETARD', label: "En retard", color: "text-red-400", icon: AlertTriangle },
] as const;

export default function StatsPlans({ refreshTrigger = 0 }: StatsPlansProps) {
  const [stats, setStats] = useState<Stats>({
    TOTAL: 0, A_FAIRE: 0, EN_COURS: 0, TERMINE: 0,
    VERIFIE: 0, ANNULE: 0, EN_RETARD: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/plans-correction');
      if (res.ok) {
        const { data } = await res.json();
        const plans = data || [];

        const newStats: Stats = {
          TOTAL: plans.length,
          A_FAIRE: 0, EN_COURS: 0, TERMINE: 0,
          VERIFIE: 0, ANNULE: 0, EN_RETARD: 0,
        };

        const now = new Date();

        plans.forEach((plan: any) => {
          let statutKey = plan.statut;

          // Calcul du retard (même logique que dans le backend)
          if (!['TERMINE', 'VERIFIE', 'ANNULE'].includes(plan.statut)) {
            if (new Date(plan.dateEcheance) < now) {
              statutKey = 'EN_RETARD';
            }
          }

          if (statutKey in newStats) {
            (newStats as any)[statutKey]++;
          }
        });

        setStats(newStats);
      }
    } catch (error) {
      console.error("Erreur stats:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats, refreshTrigger]);   // ← Important : dépend de refreshTrigger

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {STAT_CARDS.map((card) => (
          <div key={card.key} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 animate-pulse">
            {/* Skeleton */}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {STAT_CARDS.map((card) => {
        const Icon = card.icon;
        const value = stats[card.key as keyof Stats];

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