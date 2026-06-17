'use client';
import { useState, useEffect } from 'react';
import { Edit3, CheckCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

type PlanCorrection = {
  id: string;
  vulnerabilite: {
    titre: string;
    id: string;
  };
  priorite: string;
  assigneA: string | null;
  dateEcheance: string;
  statut: string;
};

export default function PlansCorrectionTable() {
  const [plans, setPlans] = useState<PlanCorrection[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/plans-correction', { cache: 'no-store' });
      if (!res.ok) throw new Error('Erreur serveur');
      const data = await res.json();
      setPlans(data);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error("Impossible de charger les plans");
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleMarkAsDone = async (id: string) => {
    if (!confirm("Marquer ce plan comme terminé ?")) return;

    try {
      const res = await fetch(`/api/plans-correction/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: 'TERMINE' }),
      });

      if (res.ok) {
        toast.success("Plan marqué comme terminé !");
        fetchPlans();
      } else {
        toast.error("Erreur lors de la mise à jour");
      }
    } catch (error) {
      toast.error("Erreur réseau");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer définitivement ce plan ?")) return;

    try {
      const res = await fetch(`/api/plans-correction/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success("Plan supprimé");
        fetchPlans();
      } else {
        toast.error("Erreur lors de la suppression");
      }
    } catch (error) {
      toast.error("Erreur réseau");
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-400">Chargement des plans...</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-900 border-b border-slate-800">
          <tr>
            <th className="px-6 py-4 text-left">ID</th>
            <th className="px-6 py-4 text-left">Vulnérabilité</th>
            <th className="px-6 py-4 text-left">Priorité</th>
            <th className="px-6 py-4 text-left">Assigné à</th>
            <th className="px-6 py-4 text-left">Échéance</th>
            <th className="px-6 py-4 text-left">Statut</th>
            <th className="px-6 py-4 text-left">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {plans.length === 0 ? (
            <tr>
              <td colSpan={7} className="text-center py-16 text-slate-500">
                Aucun plan de correction trouvé
              </td>
            </tr>
          ) : (
            plans.map((plan) => (
              <tr key={plan.id} className="hover:bg-slate-900/50">
                <td className="px-6 py-4 font-mono text-xs">{plan.id}</td>
                <td className="px-6 py-4">
                  <p className="font-medium">{plan.vulnerabilite?.titre}</p>
                  <p className="text-xs text-slate-500">{plan.vulnerabilite?.id}</p>
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
                  {plan.assigneA || <span className="text-slate-500">Non assigné</span>}
                </td>
                <td className="px-6 py-4 text-slate-300">
                  {new Date(plan.dateEcheance).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    plan.statut === 'TERMINE' ? 'bg-green-500/10 text-green-400' :
                    plan.statut === 'EN_COURS' ? 'bg-blue-500/10 text-blue-400' :
                    'bg-slate-500/10 text-slate-400'
                  }`}>
                    {plan.statut}
                  </span>
                </td>
                <td className="px-6 py-4">
  <div className="flex gap-2">
    <Button 
  variant="outline" 
  size="sm"
  onClick={() => toast("Fonctionnalité d'édition en cours de développement", { icon: '✏️' })}
>
  <Edit3 className="w-4 h-4" />
</Button>

    <Button 
      variant="outline" 
      size="sm"
      onClick={() => handleMarkAsDone(plan.id)}
      disabled={plan.statut === 'TERMINE'}
    >
      <CheckCircle className="w-4 h-4" />
    </Button>

    <Button 
      variant="outline" 
      size="sm"
      className="text-red-400 hover:text-red-500 hover:bg-red-500/10"
      onClick={() => handleDelete(plan.id)}
    >
      <Trash2 className="w-4 h-4" />
    </Button>
  </div>
</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}