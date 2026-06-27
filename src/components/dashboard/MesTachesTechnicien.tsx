'use client';
import { useState, useEffect } from 'react';
import { CheckCircle, Eye } from 'lucide-react';
import { toast } from 'react-hot-toast';
import VulnerabilityDetailModal from '../vulnerabilites/VulnerabilityDetailModal';


type TacheTechnicien = {
  id: string;
  vulnerabilite: {
    id: string;
    titre: string;
    severite: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    cveId?: string;
    scoreCVSS?: number | null;
    risqueRelatif?: number | null;
    recommandation?: string | null;
    statut?: string;
  };
  priorite: string;
  dateEcheance: string;
  statut: string;
  description?: string | null;
  commentaire?: string;
};

export default function MesTachesTechnicien() {
  const [taches, setTaches] = useState<TacheTechnicien[]>([]);
  const [loading, setLoading] = useState(true);

  // États pour le modal de détails (vulnérabilité)
  const [selectedVuln, setSelectedVuln] = useState<TacheTechnicien['vulnerabilite'] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  // 👇 On ouvre le modal en passant la vulnérabilité de la tâche
  const openDetails = (tache: TacheTechnicien) => {
    setSelectedVuln(tache.vulnerabilite);
    setIsModalOpen(true);
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
    <>
      <div className="space-y-6">
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

                <div className="flex flex-col items-end gap-4 min-w-[160px]">
                  <div className="text-right">
                    <div className="text-xs text-slate-500">Échéance</div>
                    <div className="font-medium text-white">
                      {new Date(tache.dateEcheance).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'long', year: 'numeric'
                      })}
                    </div>
                  </div>

                  <button
                    onClick={() => openDetails(tache)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-medium transition"
                  >
                    <Eye className="h-4 w-4" />
                    Détails & Correction
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 👇 Modal de détails identique à la page Vulnérabilités */}
      <VulnerabilityDetailModal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedVuln(null);
        }}
        vulnerability={
          selectedVuln
            ? {
                id: selectedVuln.id,
                titre: selectedVuln.titre,
                cveId: selectedVuln.cveId ?? null,
                severite: selectedVuln.severite,
                scoreCVSS: selectedVuln.scoreCVSS ?? null,
                risqueRelatif: selectedVuln.risqueRelatif ?? null,
                statut: selectedVuln.statut ?? 'OUVERTE',
                recommandation: selectedVuln.recommandation ?? null,
              }
            : null
        }
      />
    </>
  );
}