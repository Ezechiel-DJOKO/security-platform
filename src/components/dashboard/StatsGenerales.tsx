'use client';
import { useEffect, useState } from 'react';
import { Bug, AlertTriangle, Clock, CheckCircle } from 'lucide-react';

type DashboardStats = {
  totalVulnerabilites: number;
  vulnerabilitesOuvertes: number;
  tachesEnCours: number;
  tachesEnRetard: number;
  tauxConformite: number;
};

export default function StatsGenerales() {
  const [stats, setStats] = useState<DashboardStats>({
    totalVulnerabilites: 0,
    vulnerabilitesOuvertes: 0,
    tachesEnCours: 0,
    tachesEnRetard: 0,
    tauxConformite: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStats(data.data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="h-28 bg-slate-950 rounded-2xl animate-pulse" />;
  }

  const isEmpty = 
    stats.totalVulnerabilites === 0 && 
    stats.tachesEnCours === 0;

  return (
    <div className="space-y-3">
      {isEmpty && (
        <div className="bg-slate-900 border border-dashed border-slate-700 rounded-2xl p-6 text-center mb-6">
          <p className="text-slate-400">
            Aucune donnée disponible pour le moment.<br />
            Les statistiques apparaîtront lorsque l'Admin ou l'Auditeur lancera des scans.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Vulnérabilités */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-500/10 rounded-xl">
              <Bug className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <p className="text-3xl font-bold text-white">{stats.totalVulnerabilites}</p>
              <p className="text-sm text-slate-400">Vulnérabilités Totales</p>
            </div>
          </div>
        </div>

        {/* Vulnérabilités Ouvertes */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-500/10 rounded-xl">
              <AlertTriangle className="h-6 w-6 text-orange-400" />
            </div>
            <div>
              <p className="text-3xl font-bold text-white">{stats.vulnerabilitesOuvertes}</p>
              <p className="text-sm text-slate-400">Vulnérabilités Ouvertes</p>
            </div>
          </div>
        </div>

        {/* Tâches en Cours */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <Clock className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <p className="text-3xl font-bold text-white">{stats.tachesEnCours}</p>
              <p className="text-sm text-slate-400">Tâches en Cours</p>
            </div>
          </div>
        </div>

        {/* Taux de Conformité */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl">
              <CheckCircle className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-3xl font-bold text-white">{stats.tauxConformite}%</p>
              <p className="text-sm text-slate-400">Taux de Conformité</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}