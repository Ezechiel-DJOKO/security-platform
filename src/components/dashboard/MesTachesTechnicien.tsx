'use client';
import { useState, useEffect } from 'react';
import { CheckCircle, Clock, AlertTriangle, Upload, Eye, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

type TacheTechnicien = {
  id: string;
  vulnerabilite: {
    id: string;
    titre: string;
    severite: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    cveId?: string;
  };
  priorite: string;
  dateEcheance: string;
  statut: string;
  commentaire?: string;
};

export default function MesTachesTechnicien() {
  const [taches, setTaches] = useState<TacheTechnicien[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchMesTaches = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/plans-correction?mesTaches=true');
      if (!res.ok) throw new Error('Erreur serveur');
      const data = await res.json();
      setTaches(data.data || []);
    } catch (error) {
      console.error(error);
      toast.error("Impossible de charger vos tâches");
    } finally {
      setLoading(false);
    }
  };

  const marquerCommeCorrigee = async (planId: string) => {
    if (updating) return;
    
    setUpdating(planId);
    try {
      const res = await fetch(`/api/plans-correction/${planId}/valider`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          statut: 'CORRIGEE',
          commentaire: 'Correction appliquée par le technicien' 
        }),
      });

      if (!res.ok) throw new Error('Échec de la mise à jour');

      toast.success("Tâche marquée comme corrigée !");
      await fetchMesTaches(); // Rafraîchir la liste
    } catch (error) {
      toast.error("Erreur lors de la validation");
    } finally {
      setUpdating(null);
    }
  };

  useEffect(() => {
    fetchMesTaches();
  }, []);

  if (loading) {
    return <div className="text-slate-400 py-8 text-center">Chargement de vos tâches...</div>;
  }

  if (taches.length === 0) {
    return (
      <div className="bg-slate-950 border border-slate-800 rounded-3xl p-12 text-center">
        <CheckCircle className="h-12 w-12 mx-auto text-emerald-400 mb-4" />
        <h3 className="text-xl font-semibold text-white">Aucune tâche assignée</h3>
        <p className="text-slate-400 mt-2">Vous n'avez pas de corrections assignées pour le moment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <AlertTriangle className="h-8 w-8 text-orange-400" />
          Mes Tâches de Correction
        </h1>
        <button
          onClick={fetchMesTaches}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm transition"
        >
          <RefreshCw className="h-4 w-4" />
          Rafraîchir
        </button>
      </div>

      <div className="grid gap-4">
        {taches.map((tache) => (
          <div
            key={tache.id}
            className="border border-slate-800 bg-slate-900/50 rounded-2xl p-6 hover:border-slate-700 transition-all"
          >
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    tache.vulnerabilite.severite === 'CRITICAL' ? 'bg-red-500/10 text-red-400' :
                    tache.vulnerabilite.severite === 'HIGH' ? 'bg-orange-500/10 text-orange-400' :
                    'bg-yellow-500/10 text-yellow-400'
                  }`}>
                    {tache.vulnerabilite.severite}
                  </div>
                  <span className="text-white font-semibold text-lg">
                    {tache.vulnerabilite.titre}
                  </span>
                </div>

                {tache.vulnerabilite.cveId && (
                  <p className="text-xs text-slate-500 mb-3">{tache.vulnerabilite.cveId}</p>
                )}

                {tache.commentaire && (
                  <p className="text-sm text-slate-300 italic border-l-2 border-slate-700 pl-3">
                    {tache.commentaire}
                  </p>
                )}
              </div>

              <div className="flex flex-col items-end gap-4 min-w-[180px]">
                <div className="text-right">
                  <div className="text-xs text-slate-500">Échéance</div>
                  <div className="font-medium text-white">
                    {new Date(tache.dateEcheance).toLocaleDateString('fr-FR', {
                      day: 'numeric', month: 'long', year: 'numeric'
                    })}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <Link
                    href={`/vulnerabilites/${tache.vulnerabilite.id}`}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm transition"
                  >
                    <Eye className="h-4 w-4" />
                    Détails
                  </Link>

                  <button
                    onClick={() => marquerCommeCorrigee(tache.id)}
                    disabled={updating === tache.id}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl text-sm text-white transition"
                  >
                    <Upload className="h-4 w-4" />
                    {updating === tache.id ? 'En cours...' : 'Marquer comme corrigée'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}