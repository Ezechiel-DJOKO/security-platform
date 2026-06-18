'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Edit3, CheckCircle, Trash2, XCircle, Eye, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

type PlanCorrection = {
  id: string;
  vulnerabilite: {
    id: string;
    titre: string;
    severite: string;
  };
  priorite: string;
  assigneA: string | null;
  dateEcheance: string;
  statut: string;
};

interface PlansCorrectionTableProps {
  filterStatus?: string;
  searchTerm?: string;
  onStatChange?: () => void;
}

const statutConfig: Record<string, { label: string; color: string }> = {
  A_FAIRE: { label: "À faire", color: "bg-slate-500/10 text-slate-400" },
  EN_COURS: { label: "En cours", color: "bg-blue-500/10 text-blue-400" },
  TERMINE: { label: "Terminé", color: "bg-green-500/10 text-green-400" },
  VERIFIE: { label: "Vérifié", color: "bg-emerald-500/10 text-emerald-400" },
  ANNULE: { label: "Annulé", color: "bg-gray-500/10 text-gray-400" },
  EN_RETARD: { label: "En retard", color: "bg-red-500/10 text-red-400" },
};

export default function PlansCorrectionTable({
  filterStatus = '',
  searchTerm = '',
  onStatChange,
}: PlansCorrectionTableProps) {

  const [plans, setPlans] = useState<PlanCorrection[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/plans-correction', { 
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      const data = await res.json();
      setPlans(Array.isArray(data) ? data : data.plans || []);
    } catch (error) {
      console.error('Erreur fetch plans:', error);
      toast.error("Impossible de charger les plans de correction");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const filteredPlans = useMemo(() => {
    return plans.filter((plan) => {
      const matchStatus = !filterStatus || plan.statut === filterStatus;
      const matchSearch = !searchTerm || 
        plan.vulnerabilite.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plan.vulnerabilite.id.toLowerCase().includes(searchTerm.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [plans, filterStatus, searchTerm]);

  const updateStatut = useCallback(async (id: string, newStatut: string) => {
    const config = statutConfig[newStatut];
    if (!confirm(`Changer le statut en "${config?.label}" ?`)) return;

    try {
      const res = await fetch(`/api/plans-correction/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: newStatut }),
      });

      if (res.ok) {
        toast.success(`✅ Statut mis à jour → ${config.label}`);
        fetchPlans();           // Rafraîchir la table
        onStatChange?.();       // Rafraîchir les stats
      } else {
        toast.error("Erreur lors de la mise à jour du statut");
      }
    } catch (error) {
      toast.error("Erreur réseau");
    }
  }, [onStatChange]);

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer définitivement ce plan de correction ?")) return;
    try {
      const res = await fetch(`/api/plans-correction/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success("🗑️ Plan supprimé");
        fetchPlans();
        onStatChange?.();
      } else {
        toast.error("Erreur lors de la suppression");
      }
    } catch (error) {
      toast.error("Erreur réseau");
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-400">Chargement des plans de correction...</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-900 border-b border-slate-800">
          <tr>
            <th className="px-6 py-4 text-left">Vulnérabilité</th>
            <th className="px-6 py-4 text-left">Priorité</th>
            <th className="px-6 py-4 text-left">Assigné à</th>
            <th className="px-6 py-4 text-left">Échéance</th>
            <th className="px-6 py-4 text-left">Statut</th>
            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {filteredPlans.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center py-16 text-slate-500">
                Aucun plan de correction trouvé
              </td>
            </tr>
          ) : (
            filteredPlans.map((plan) => {
              const config = statutConfig[plan.statut] || { label: plan.statut, color: "bg-slate-500/10 text-slate-400" };

              return (
                <tr key={plan.id} className="hover:bg-slate-900/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-medium line-clamp-2">{plan.vulnerabilite.titre}</p>
                    <p className="text-xs text-slate-500 mt-1">{plan.vulnerabilite.id}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      plan.priorite === 'CRITIQUE' ? 'bg-red-500/10 text-red-400' :
                      plan.priorite === 'HAUTE' ? 'bg-orange-500/10 text-orange-400' :
                      'bg-yellow-500/10 text-yellow-400'
                    }`}>
                      {plan.priorite}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-300">
                    {plan.assigneA || <span className="italic text-slate-500">Non assigné</span>}
                  </td>
                  <td className="px-6 py-4 text-slate-300">
                    {new Date(plan.dateEcheance).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.color}`}>
                      {config.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex gap-2 justify-end flex-wrap">
                      
                      {/* Démarrer (A_FAIRE → EN_COURS) */}
                      {(plan.statut === 'A_FAIRE' || plan.statut === 'EN_RETARD') && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-blue-400 hover:text-blue-500"
                          onClick={() => updateStatut(plan.id, 'EN_COURS')}
                        >
                          <Play className="w-4 h-4 mr-1" />
                          Démarrer
                        </Button>
                      )}

                      {/* Terminer (EN_COURS → TERMINE) */}
                      {plan.statut === 'EN_COURS' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-emerald-400 hover:text-emerald-500"
                          onClick={() => updateStatut(plan.id, 'TERMINE')}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Terminé
                        </Button>
                      )}

                      {/* Vérifier (TERMINE → VERIFIE) */}
                      {plan.statut === 'TERMINE' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-emerald-400 hover:text-emerald-500"
                          onClick={() => updateStatut(plan.id, 'VERIFIE')}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Vérifier
                        </Button>
                      )}

                      {/* Annuler */}
                      {plan.statut !== 'VERIFIE' && plan.statut !== 'ANNULE' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-400 hover:text-red-500"
                          onClick={() => updateStatut(plan.id, 'ANNULE')}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      )}

                      {/* Édition */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toast("Fonction d'édition complète à venir")}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>

                      {/* Suppression */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-400 hover:text-red-500"
                        onClick={() => handleDelete(plan.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}