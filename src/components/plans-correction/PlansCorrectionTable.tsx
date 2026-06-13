'use client';

import { useState, useEffect } from 'react';
import { Edit3, CheckCircle, User, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type PlanCorrection = {
  id: string;
  vulnerabiliteId: string;
  titreVulnerabilite: string;
  priorite: string;
  assigneA: string;
  dateEcheance: string;
  statut: string;
};

export default function PlansCorrectionTable() {
  const [plans, setPlans] = useState<PlanCorrection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/plans-correction', { cache: 'no-store' });
      const data = await res.json();
      setPlans(data);
    } catch (error) {
      console.error('Erreur:', error);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-400">Chargement des plans...</div>;
  }

  return (
    <div className="overflow-x-auto p-4">
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
                <td className="px-6 py-4 font-mono">{plan.id}</td>
                <td className="px-6 py-4">
                  <p className="font-medium">{plan.titreVulnerabilite}</p>
                  <p className="text-xs text-slate-500">{plan.vulnerabiliteId}</p>
                </td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 rounded-full bg-orange-500/10 text-orange-400 text-xs font-medium">
                    {plan.priorite}
                  </span>
                </td>
                <td className="px-6 py-4">{plan.assigneA}</td>
                <td className="px-6 py-4 text-slate-300">{plan.dateEcheance}</td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs">
                    {plan.statut}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm"><Edit3 className="w-4 h-4" /></Button>
                    <Button variant="outline" size="sm"><CheckCircle className="w-4 h-4" /></Button>
                    <Button variant="outline" size="sm"><Trash2 className="w-4 h-4" /></Button>
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