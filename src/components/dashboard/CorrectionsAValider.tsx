'use client';
import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, User, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';

type PlanCorrection = {
  id: string;
  vulnerabilite: {
    id: string;
    titre: string;
    severite: string;
    cveId?: string;
  };
  assigne: {
    nom: string;
    prenom: string;
  } | null;
  priorite: string;
  dateEcheance: string;
  statut: string;
  commentaire?: string;
  preuve?: string;
  dateResolution?: string;
};

export default function CorrectionsAValider() {
  const [plans, setPlans] = useState<PlanCorrection[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchPlansAValider = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/plans-correction?aValider=true');
      if (!res.ok) throw new Error('Erreur lors du chargement');
      const data = await res.json();
      setPlans(data.data || []);
    } catch (error) {
      console.error(error);
      toast.error("Impossible de charger les corrections à valider");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlansAValider();
  }, []);

  const handleValidation = async (planId: string, action: 'VALIDER' | 'REJETER', commentaire?: string) => {
    setActionLoading(planId);
    try {
      const res = await fetch(`/api/plans-correction/${planId}/valider`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, commentaire }),
      });

      if (!res.ok) throw new Error('Action échouée');

      toast.success(action === 'VALIDER' ? 'Correction validée avec succès !' : 'Correction rejetée');
      fetchPlansAValider(); // Rafraîchir la liste
    } catch (error) {
      toast.error("Une erreur s'est produite");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <div className="text-slate-400 py-8 text-center">Chargement des corrections à valider...</div>;
  }

  if (plans.length === 0) {
    return (
      <div className="bg-slate-950 border border-slate-800 rounded-3xl p-10 text-center">
        <CheckCircle className="h-12 w-12 mx-auto text-emerald-400 mb-4" />
        <h3 className="text-xl font-semibold text-white">Aucune correction en attente</h3>
        <p className="text-slate-400 mt-2">Toutes les corrections ont déjà été traitées.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white flex items-center gap-3">
          <Clock className="h-6 w-6 text-amber-400" />
          Corrections à Valider ({plans.length})
        </h2>
        <button
          onClick={fetchPlansAValider}
          className="text-sm text-slate-400 hover:text-white flex items-center gap-1"
        >
          Rafraîchir
        </button>
      </div>

      <div className="space-y-4">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="border border-slate-800 bg-slate-900/50 rounded-2xl p-5 hover:border-slate-700 transition-colors"
          >
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-start gap-3">
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    plan.vulnerabilite.severite === 'CRITICAL' ? 'bg-red-500/10 text-red-400' :
                    plan.vulnerabilite.severite === 'HIGH' ? 'bg-orange-500/10 text-orange-400' : 'bg-yellow-500/10 text-yellow-400'
                  }`}>
                    {plan.vulnerabilite.severite}
                  </div>
                  <div>
                    <h4 className="font-medium text-white">{plan.vulnerabilite.titre}</h4>
                    {plan.vulnerabilite.cveId && (
                      <p className="text-xs text-slate-500 mt-0.5">{plan.vulnerabilite.cveId}</p>
                    )}
                  </div>
                </div>

                <div className="mt-3 text-sm text-slate-400 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Assigné à : {plan.assigne ? `${plan.assigne.prenom} ${plan.assigne.nom}` : 'Non assigné'}
                </div>

                {plan.commentaire && (
                  <p className="mt-2 text-sm text-slate-300 italic">"{plan.commentaire}"</p>
                )}
              </div>

              <div className="flex flex-col items-end gap-3 min-w-[180px]">
                <div className="text-xs text-slate-500">
                  Échéance : {new Date(plan.dateEcheance).toLocaleDateString('fr-FR')}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleValidation(plan.id, 'REJETER')}
                    disabled={!!actionLoading}
                    className="flex items-center gap-2 px-5 py-2 bg-red-900/80 hover:bg-red-800 text-red-100 rounded-xl text-sm transition disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" />
                    Rejeter
                  </button>

                  <button
                    onClick={() => handleValidation(plan.id, 'VALIDER')}
                    disabled={!!actionLoading}
                    className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm transition disabled:opacity-50"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Valider
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