'use client';
import { useEffect, useState } from 'react';
import { 
  ClipboardList, 
  Clock, 
  CheckCircle, 
  Eye, 
  XCircle, 
  AlertTriangle 
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
  onRefresh?: () => void;
}

export default function StatsPlans({ onRefresh }: StatsPlansProps) {
  const [stats, setStats] = useState<Stats>({
    TOTAL: 0,
    A_FAIRE: 0,
    EN_COURS: 0,
    TERMINE: 0,
    VERIFIE: 0,
    ANNULE: 0,
    EN_RETARD: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/plans-correction/stats', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Erreur stats :", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (onRefresh) {
      fetchStats();
    }
  }, [onRefresh]);

  const cards = [
    { 
      key: 'A_FAIRE', 
      label: "À faire", 
      value: stats.A_FAIRE, 
      color: "text-slate-400",
      icon: ClipboardList 
    },
    { 
      key: 'EN_COURS', 
      label: "En cours", 
      value: stats.EN_COURS, 
      color: "text-blue-400",
      icon: Clock 
    },
    { 
      key: 'TERMINE', 
      label: "Terminés", 
      value: stats.TERMINE, 
      color: "text-green-400",
      icon: CheckCircle 
    },
    { 
      key: 'VERIFIE', 
      label: "Vérifiés", 
      value: stats.VERIFIE, 
      color: "text-emerald-400",
      icon: Eye 
    },
    { 
      key: 'ANNULE', 
      label: "Annulés", 
      value: stats.ANNULE, 
      color: "text-gray-400",
      icon: XCircle 
    },
    { 
      key: 'EN_RETARD', 
      label: "En retard", 
      value: stats.EN_RETARD, 
      color: "text-red-400",
      icon: AlertTriangle 
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div 
            key={card.key} 
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">{card.label}</p>
                <p className="text-4xl font-bold text-white mt-3">
                  {loading ? '...' : card.value}
                </p>
              </div>
              <div className={`p-3 rounded-xl bg-slate-800/50 group-hover:bg-slate-800 transition-colors`}>
                <Icon className={`w-9 h-9 ${card.color}`} strokeWidth={2} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}