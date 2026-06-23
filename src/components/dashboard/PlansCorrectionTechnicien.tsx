'use client';
import { useState, useEffect } from 'react';
import { CheckCircle, Clock, AlertTriangle, Upload, Eye } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

type PlanCorrection = {
  id: string;
  vulnerabilite: {
    id: string;
    titre: string;
    severite: string;
    cveId?: string;
  };
  priorite: string;
  dateEcheance: string;
  statut: 'A_FAIRE' | 'EN_COURS' | 'TERMINE' | 'VERIFIE' | 'ANNULE' | 'EN_RETARD';
  commentaire?: string;
};

export default function PlansCorrectionTechnicien() {
  const [plans, setPlans] = useState<PlanCorrection[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/plans-correction?mesPlans=true');
      if (!res.ok) throw new Error('Erreur serveur');
      const { data } = await res.json();
      setPlans(data || []);
    } catch (error) {
      console.error(error);
      toast.error("Impossible de charger vos plans de correction");
    } finally {
      setLoading(false);
    }
  };

  const marquerCommeCorrigee = async (planId: string) => {
    setUpdatingId(planId);
    try {
      const res = await fetch(`/api/plans-correction/${planId}/valider`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statut: 'TERMINE',
          commentaire: 'Correction terminée par le technicien'
        }),
      });

      if (!res.ok) throw new Error();

      toast.success("Plan marqué comme terminé !");
      fetchPlans();
    } catch {
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setUpdatingId(null);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  if (loading) {
    return <div className="text-slate-400 py-12 text-center">Chargement de vos plans...</div>;
  }

  if (plans.length === 0) {
    return (
      <div className="bg-slate-950 border border-slate-800 rounded-3xl p-16 text-center">
        <CheckCircle className="h-16 w-16 mx-auto text-emerald-400 mb-6" />
        <h3 className="text-2xl font-semibold text-white">Aucun plan assigné</h3>
        <p className="text-slate-400 mt-3">Vous n'avez pas de plans de correction pour le moment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {plans.map((plan) => (
        <div
          key={plan.id}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all"
        >
          <div className="flex flex-col lg:flex-row justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  plan.vulnerabilite.severite === 'CRITICAL' ? 'bg-red-500/10 text-red-400' :
                  plan.vulnerabilite.severite === 'HIGH' ? 'bg-orange-500/10 text-orange-400' :
                  'bg-yellow-500/10 text-yellow-400'
                }`}>
                  {plan.vulnerabilite.severite}
                </div>
                <h3 className="text-lg font-semibold text-white">{plan.vulnerabilite.titre}</h3>
              </div>

              {plan.vulnerabilite.cveId && (
                <p className="text-xs text-slate-500 mb-3">{plan.vulnerabilite.cveId}</p>
              )}

              <div className="flex gap-6 text-sm">
                <div>
                  <span className="text-slate-500">Priorité :</span>{' '}
                  <span className="font-medium text-white">{plan.priorite}</span>
                </div>
                <div>
                  <span className="text-slate-500">Échéance :</span>{' '}
                  <span className="font-medium text-white">
                    {new Date(plan.dateEcheance).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-4">
              <div className={`px-4 py-1 rounded-full text-xs font-medium capitalize ${
                ['TERMINE', 'VERIFIE'].includes(plan.statut) 
                  ? 'bg-emerald-500/10 text-emerald-400' 
                  : plan.statut === 'EN_RETARD' 
                  ? 'bg-red-500/10 text-red-400' 
                  : 'bg-orange-500/10 text-orange-400'
              }`}>
                {plan.statut.replace('_', ' ')}
              </div>

              <div className="flex gap-3">
                <Link
                  href={`/vulnerabilites/${plan.vulnerabilite.id}`}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm transition"
                >
                  <Eye className="h-4 w-4" />
                  Détails
                </Link>

                {['A_FAIRE', 'EN_COURS'].includes(plan.statut) && (
                  <button
                    onClick={() => marquerCommeCorrigee(plan.id)}
                    disabled={updatingId === plan.id}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl text-sm text-white transition"
                  >
                    <Upload className="h-4 w-4" />
                    {updatingId === plan.id ? 'En cours...' : 'Marquer comme terminé'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}