'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Edit3, Trash2, Play, User, Search, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

type PlanCorrection = {
  id: string;
  vulnerabilite: { id: string; titre: string; severite: string; statut: string };
  assigne: { id: string; nom: string; prenom: string; email?: string } | null;
  priorite: string;
  dateEcheance: string;
  statut: string;
  commentaire?: string;
};

const statutConfig: Record<string, { label: string; color: string }> = {
  A_FAIRE: { label: "À faire", color: "bg-slate-500/10 text-slate-400" },
  EN_COURS: { label: "En cours", color: "bg-blue-500/10 text-blue-400" },
  TERMINE: { label: "Terminé", color: "bg-green-500/10 text-green-400" },
  VERIFIE: { label: "Vérifié", color: "bg-emerald-500/10 text-emerald-400" },
  ANNULE: { label: "Annulé", color: "bg-gray-500/10 text-gray-400" },
  EN_RETARD: { label: "En retard", color: "bg-red-500/10 text-red-400" },
};

export default function PlansCorrectionTable() {
  const [plans, setPlans] = useState<PlanCorrection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [editingPlan, setEditingPlan] = useState<PlanCorrection | null>(null);

  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch('/api/plans-correction');
      const data = await res.json();
      setPlans(Array.isArray(data) ? data : data.data || []);
    } catch (error) {
      console.error(error);
      toast.error("Impossible de charger les plans");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
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

  // ====================== ACTIONS ======================
  const updateStatut = useCallback(async (id: string, newStatut: string) => {
    if (!confirm(`Passer le statut à "${statutConfig[newStatut]?.label}" ?`)) return;
    try {
      const res = await fetch(`/api/plans-correction/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: newStatut }),
      });
      if (res.ok) {
        toast.success(`Statut mis à jour → ${statutConfig[newStatut].label}`);
        fetchPlans();
      } else {
        toast.error("Erreur lors de la mise à jour");
      }
    } catch {
      toast.error("Erreur réseau");
    }
  }, [fetchPlans]);

  const handleEdit = (plan: PlanCorrection) => setEditingPlan(plan);

  const saveEdit = async (updatedData: any) => {
    if (!editingPlan) return;
    try {
      const res = await fetch(`/api/plans-correction/${editingPlan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });
      if (res.ok) {
        toast.success("Plan modifié avec succès");
        fetchPlans();
        setEditingPlan(null);
      } else {
        toast.error("Erreur lors de la modification");
      }
    } catch {
      toast.error("Erreur réseau");
    }
  };

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Supprimer définitivement ce plan ?")) return;
    try {
      const res = await fetch(`/api/plans-correction/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success("Plan supprimé");
        fetchPlans();
      }
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  }, [fetchPlans]);

  // ====================== RENDU ======================
  if (loading) {
    return <div className="text-center py-12 text-slate-400">Chargement des plans...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex flex-wrap gap-3 items-center bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
          <input
            type="text"
            placeholder="Rechercher par titre ou CVE..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 pl-10 py-2.5 rounded-lg text-sm"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5"
        >
          <option value="">Tous les statuts</option>
          <option value="A_FAIRE">À faire</option>
          <option value="EN_COURS">En cours</option>
          <option value="TERMINE">Terminé</option>
          <option value="VERIFIE">Vérifié</option>
          <option value="ANNULE">Annulé</option>
          <option value="EN_RETARD">En retard</option>
        </select>

        <Button variant="outline" onClick={fetchPlans}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Rafraîchir
        </Button>
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto bg-slate-900 border border-slate-800 rounded-2xl">
        <table className="w-full text-sm">
          <thead className="bg-slate-950">
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
                <td colSpan={6} className="py-16">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="text-6xl mb-4 text-slate-700">📭</div>
                    <p className="text-xl font-medium text-slate-300">Aucun plan de correction trouvé</p>
                    <p className="text-slate-500 mt-2 max-w-sm">
                      {searchTerm || filterStatus
                        ? "Aucun résultat ne correspond à vos filtres"
                        : "Vous n'avez pas encore créé de plan de correction"}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredPlans.map((plan) => {
                const config = statutConfig[plan.statut] || { label: plan.statut, color: "bg-slate-500/10 text-slate-400" };
                return (
                  <tr key={plan.id} className="hover:bg-slate-800/50">
                    <td className="px-6 py-4">
                      <p className="font-medium">{plan.vulnerabilite.titre}</p>
                      <p className="text-xs text-slate-500">{plan.vulnerabilite.id}</p>
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
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-emerald-400" />
                          <span>{plan.assigne.prenom} {plan.assigne.nom}</span>
                        </div>
                      ) : (
                        <span className="text-orange-400 italic">Non assigné</span>
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
                      <div className="flex gap-2 justify-end">
                        {(plan.statut === 'A_FAIRE' || plan.statut === 'EN_RETARD') && (
                          <Button size="sm" variant="outline" onClick={() => updateStatut(plan.id, 'EN_COURS')}>
                            <Play className="w-4 h-4 mr-1" /> Démarrer
                          </Button>
                        )}
                        {plan.statut === 'EN_COURS' && (
                          <Button size="sm" variant="outline" onClick={() => updateStatut(plan.id, 'TERMINE')}>
                            Terminer
                          </Button>
                        )}
                        {plan.statut === 'TERMINE' && (
                          <Button size="sm" variant="outline" className="text-emerald-400" onClick={() => updateStatut(plan.id, 'VERIFIE')}>
                            Vérifier
                          </Button>
                        )}
                        {(plan.statut !== 'ANNULE' && plan.statut !== 'VERIFIE') && (
                          <Button size="sm" variant="outline" className="text-gray-400" onClick={() => updateStatut(plan.id, 'ANNULE')}>
                            Annuler
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => handleEdit(plan)}>
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-400" onClick={() => handleDelete(plan.id)}>
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

      {/* Modal d'édition */}
      {editingPlan && (
        <EditPlanModal
          plan={editingPlan}
          isOpen={!!editingPlan}
          onClose={() => setEditingPlan(null)}
          onSave={saveEdit}
        />
      )}
    </div>
  );
}

/* ====================== MODAL D'ÉDITION (avec sélection technicien) ====================== */
function EditPlanModal({ plan, isOpen, onClose, onSave }: {
  plan: PlanCorrection;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
}) {
  const [form, setForm] = useState({
    priorite: plan.priorite,
    dateEcheance: plan.dateEcheance.split('T')[0],
    commentaire: plan.commentaire || '',
    assigneA: plan.assigne?.id || '',
  });

  const [techniciens, setTechniciens] = useState<any[]>([]);
  const [loadingTech, setLoadingTech] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoadingTech(true);
    fetch('/api/users?role=TECHNICIEN')
      .then(r => r.json())
      .then(data => setTechniciens(Array.isArray(data) ? data : data.data || []))
      .catch(err => console.error(err))
      .finally(() => setLoadingTech(false));
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6">
        <div className="flex justify-between mb-6">
          <h2 className="text-xl font-semibold">Modifier le Plan</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Sélection Technicien */}
          <div>
            <label className="text-sm text-slate-400 block mb-1">Technicien assigné</label>
            <select
              value={form.assigneA}
              onChange={(e) => setForm({ ...form, assigneA: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3"
            >
              <option value="">Non assigné</option>
              {techniciens.map((tech: any) => (
                <option key={tech.id} value={tech.id}>
                  {tech.prenom} {tech.nom} — {tech.email}
                </option>
              ))}
            </select>
          </div>

          {/* Priorité */}
          <div>
            <label className="text-sm text-slate-400">Priorité</label>
            <select 
              value={form.priorite} 
              onChange={(e) => setForm({ ...form, priorite: e.target.value })} 
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 mt-1"
            >
              <option value="CRITIQUE">Critique</option>
              <option value="HAUTE">Haute</option>
              <option value="MOYENNE">Moyenne</option>
              <option value="BASSE">Basse</option>
            </select>
          </div>

          {/* Date d'échéance */}
          <div>
            <label className="text-sm text-slate-400">Date d'échéance</label>
            <input 
              type="date" 
              value={form.dateEcheance} 
              onChange={(e) => setForm({ ...form, dateEcheance: e.target.value })} 
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 mt-1" 
            />
          </div>

          {/* Commentaire */}
          <div>
            <label className="text-sm text-slate-400">Commentaire / Actions</label>
            <textarea 
              value={form.commentaire} 
              onChange={(e) => setForm({ ...form, commentaire: e.target.value })} 
              rows={4} 
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 mt-1" 
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" className="flex-1">
              Enregistrer les modifications
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}