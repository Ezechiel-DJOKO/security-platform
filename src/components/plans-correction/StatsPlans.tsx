'use client';

import { Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function StatsPlans() {
  const [stats, setStats] = useState({
    enCours: 0,
    aValider: 0,
    termines: 0,
    enRetard: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/plans-correction/stats', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Erreur stats plans:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="h-32 bg-slate-900 rounded-2xl animate-pulse" />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6">
        <Clock className="w-8 h-8 text-blue-400 mb-4" />
        <p className="text-4xl font-bold text-white">{stats.enCours}</p>
        <p className="text-slate-400 mt-1">En cours</p>
      </div>

      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6">
        <AlertTriangle className="w-8 h-8 text-amber-400 mb-4" />
        <p className="text-4xl font-bold text-white">{stats.aValider}</p>
        <p className="text-slate-400 mt-1">À valider</p>
      </div>

      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6">
        <CheckCircle className="w-8 h-8 text-emerald-400 mb-4" />
        <p className="text-4xl font-bold text-white">{stats.termines}</p>
        <p className="text-slate-400 mt-1">Terminés</p>
      </div>

      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6">
        <AlertTriangle className="w-8 h-8 text-red-400 mb-4" />
        <p className="text-4xl font-bold text-white">{stats.enRetard}</p>
        <p className="text-slate-400 mt-1">En retard</p>
      </div>
    </div>
  );
}