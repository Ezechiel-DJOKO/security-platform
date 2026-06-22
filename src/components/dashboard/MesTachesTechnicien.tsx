'use client';
import { useState, useEffect } from 'react';
import { CheckCircle, Clock, AlertTriangle, Upload, Eye } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

type TacheTechnicien = {
  id: string;
  vulnerabilite: {
    id: string;
    titre: string;
    severite: string;
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

  const fetchMesTaches = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/plans-correction?mesTaches=true');
      if (!res.ok) throw new Error('Erreur de chargement');
      const data = await res.json();
      setTaches(data.data || []);
    } catch (error) {
      console.error(error);
      toast.error("Impossible de charger vos tâches");
    } finally {
      setLoading(false);
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
    <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-orange-400" />
          Mes Tâches Assignées ({taches.length})
        </h2>
        <button onClick={fetchMesTaches} className="text-sm text-slate-400 hover:text-white">
          Rafraîchir
        </button>
      </div>

      <div className="space-y-4">
        {taches.map((tache) => (
          <div
            key={tache.id}
            className="border border-slate-800 bg-slate-900/50 rounded-2xl p-5 hover:border-slate-700 transition-all"
          >
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    tache.vulnerabilite.severite === 'CRITICAL' ? 'bg-red-500/10 text-red-400' :
                    tache.vulnerabilite.severite === 'HIGH' ? 'bg-orange-500/10 text-orange-400' :
                    'bg-yellow-500/10 text-yellow-400'
                  }`}>
                    {tache.vulnerabilite.severite}
                  </div>
                  <div className="font-medium text-white text-lg">
                    {tache.vulnerabilite.titre}
                  </div>
                </div>

                {tache.vulnerabilite.cveId && (
                  <p className="text-xs text-slate-500 mt-1">{tache.vulnerabilite.cveId}</p>
                )}

                {tache.commentaire && (
                  <p className="mt-3 text-sm text-slate-300 italic border-l-2 border-slate-700 pl-3">
                    {tache.commentaire}
                  </p>
                )}
              </div>

              <div className="flex flex-col items-end gap-3">
                <div className="text-right">
                  <div className="text-xs text-slate-500">Priorité • Échéance</div>
                  <div className="text-sm font-medium text-white">
                    {new Date(tache.dateEcheance).toLocaleDateString('fr-FR')}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/vulnerabilites/${tache.vulnerabilite.id}`}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm transition"
                  >
                    <Eye className="h-4 w-4" />
                    Détails
                  </Link>

                  <button
                    onClick={() => toast("Fonctionnalité d'upload de preuve à implémenter")}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm text-white transition"
                  >
                    <Upload className="h-4 w-4" />
                    Marquer comme corrigée
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