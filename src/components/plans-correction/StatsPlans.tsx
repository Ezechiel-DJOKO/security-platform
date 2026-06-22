'use client';
import { useEffect, useState, useCallback } from 'react';
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

// Define the card data outside the component for better performance
const STAT_CARDS = [
  { key: 'A_FAIRE' as const, label: "À faire", color: "text-slate-400", icon: ClipboardList },
  { key: 'EN_COURS' as const, label: "En cours", color: "text-blue-400", icon: Clock },
  { key: 'TERMINE' as const, label: "Terminés", color: "text-green-400", icon: CheckCircle },
  { key: 'VERIFIE' as const, label: "Vérifiés", color: "text-emerald-400", icon: Eye },
  { key: 'ANNULE' as const, label: "Annulés", color: "text-gray-400", icon: XCircle },
  { key: 'EN_RETARD' as const, label: "En retard", color: "text-red-400", icon: AlertTriangle },
] as const;

// Define the type for stat keys
type StatKey = typeof STAT_CARDS[number]['key'];

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

  // Use useCallback to memoize the fetch function
  const fetchStats = useCallback(async () => {
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
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    let isMounted = true;
    
    const loadStats = async () => {
      if (isMounted) {
        await fetchStats();
      }
    };
    
    loadStats();
    
    return () => {
      isMounted = false;
    };
  }, [fetchStats]);

  // Handle refresh callback
  useEffect(() => {
    let isMounted = true;
    
    if (onRefresh) {
      const refreshStats = async () => {
        if (isMounted) {
          await fetchStats();
        }
      };
      
      refreshStats();
    }
    
    return () => {
      isMounted = false;
    };
  }, [onRefresh, fetchStats]);

  // Show loading state
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {STAT_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div 
              key={card.key} 
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-slate-800 rounded w-20 mb-3"></div>
                  <div className="h-10 bg-slate-800 rounded w-12"></div>
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {STAT_CARDS.map((card) => {
        const Icon = card.icon;
        // Type-safe access to stats
        const value = stats[card.key as StatKey];
        
        return (
          <div 
            key={card.key} 
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">{card.label}</p>
                <p className="text-4xl font-bold text-white mt-3">
                  {value}
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