'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Edit3, Trash2, Play, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

type PlanCorrection = {
  id: string;
  vulnerabilite: {
    id: string;
    titre: string;
    severite: string;
    statut: string;
  };
  assigne: { 
    id: string;
    nom: string;
    prenom: string;
  } | null;
  priorite: string;
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

  // Use useCallback to memoize fetchPlans
  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch('/api/plans-correction', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      const data = await res.json();
      setPlans(Array.isArray(data) ? data : data.plans || data.data || []);
    } catch (_error) {
      // Prefix with underscore to indicate intentionally unused
      console.error('Erreur fetch plans:', _error);
      toast.error("Impossible de charger les plans de correction");
    } finally {
      setLoading(false);
    }
  }, []);

  // Move useEffect after fetchPlans is defined
  useEffect(() => {
    let isMounted = true;
    
    const loadPlans = async () => {
      if (isMounted) {
        await fetchPlans();
      }
    };
    
    loadPlans();
    
    return () => {
      isMounted = false;
    };
  }, [fetchPlans]);

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
        await fetchPlans();
        onStatChange?.();
      } else {
        toast.error("Erreur lors de la mise à jour du statut");
      }
    } catch (_error) {
      // Prefix with underscore to indicate intentionally unused
      toast.error("Erreur réseau");
    }
  }, [fetchPlans, onStatChange]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Supprimer définitivement ce plan de correction ?")) return;
    try {
      const res = await fetch(`/api/plans-correction/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success("🗑️ Plan supprimé");
        await fetchPlans();
        onStatChange?.();
      } else {
        toast.error("Erreur lors de la suppression");
      }
    } catch (_error) {
      // Prefix with underscore to indicate intentionally unused
      toast.error("Erreur réseau");
    }
  }, [fetchPlans, onStatChange]);

  // Loading skeleton
  if (loading) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 border-b border-slate-800">
            <tr>
              <th className="px-6 py-4 text-left text-slate-300 font-medium">Vulnérabilité</th>
              <th className="px-6 py-4 text-left text-slate-300 font-medium">Priorité</th>
              <th className="px-6 py-4 text-left text-slate-300 font-medium">Assigné à</th>
              <th className="px-6 py-4 text-left text-slate-300 font-medium">Échéance</th>
              <th className="px-6 py-4 text-left text-slate-300 font-medium">Statut</th>
              <th className="px-6 py-4 text-right text-slate-300 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {[...Array(5)].map((_, index) => (
              <tr key={index} className="animate-pulse">
                <td className="px-6 py-4">
                  <div className="h-4 bg-slate-800 rounded w-48"></div>
                  <div className="h-3 bg-slate-800 rounded w-24 mt-2"></div>
                </td>
                <td className="px-6 py-4">
                  <div className="h-6 bg-slate-800 rounded w-16"></div>
                </td>
                <td className="px-6 py-4">
                  <div className="h-6 bg-slate-800 rounded w-24"></div>
                </td>
                <td className="px-6 py-4">
                  <div className="h-4 bg-slate-800 rounded w-20"></div>
                </td>
                <td className="px-6 py-4">
                  <div className="h-6 bg-slate-800 rounded w-16"></div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex gap-2 justify-end">
                    <div className="h-8 w-8 bg-slate-800 rounded"></div>
                    <div className="h-8 w-8 bg-slate-800 rounded"></div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-900 border-b border-slate-800">
          <tr>
            <th className="px-6 py-4 text-left text-slate-300 font-medium">Vulnérabilité</th>
            <th className="px-6 py-4 text-left text-slate-300 font-medium">Priorité</th>
            <th className="px-6 py-4 text-left text-slate-300 font-medium">Assigné à</th>
            <th className="px-6 py-4 text-left text-slate-300 font-medium">Échéance</th>
            <th className="px-6 py-4 text-left text-slate-300 font-medium">Statut</th>
            <th className="px-6 py-4 text-right text-slate-300 font-medium">Actions</th>
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
              const config = statutConfig[plan.statut] || { 
                label: plan.statut, 
                color: "bg-slate-500/10 text-slate-400" 
              };

              return (
                <tr key={plan.id} className="hover:bg-slate-900/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-medium line-clamp-2 text-slate-100">{plan.vulnerabilite.titre}</p>
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

                  <td className="px-6 py-4">
                    {plan.assigne ? (
                      <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-lg w-fit">
                        <User className="w-4 h-4 text-emerald-400" />
                        <span className="font-mono text-slate-200 text-sm">
                          {plan.assigne.id}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-500 text-lg font-light">-</span>
                    )}
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
                      {(plan.statut === 'A_FAIRE' || plan.statut === 'EN_RETARD') && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10" 
                          onClick={() => updateStatut(plan.id, 'EN_COURS')}
                          aria-label="Démarrer le plan"
                        >
                          <Play className="w-4 h-4 mr-1" /> Démarrer
                        </Button>
                      )}
                      {plan.statut === 'EN_COURS' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-green-400 hover:text-green-300 hover:bg-green-500/10" 
                          onClick={() => updateStatut(plan.id, 'TERMINE')}
                          aria-label="Terminer le plan"
                        >
                          <Play className="w-4 h-4 mr-1 rotate-90" /> Terminer
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => toast("Fonction d'édition complète à venir")}
                        aria-label="Modifier le plan"
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10" 
                        onClick={() => handleDelete(plan.id)}
                        aria-label="Supprimer le plan"
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