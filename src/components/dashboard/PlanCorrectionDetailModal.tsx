'use client';
import { useState, useEffect } from 'react';
import { X, AlertCircle, Clock, Edit3, Trash2, Save } from 'lucide-react';
import { getVulnerabilityHistory } from '@/actions/vulnerabilityActions';
import type { HistoriqueVulnerabilite, Severite } from '@prisma/client';
import { useSession } from 'next-auth/react';

interface PlanCorrectionDetailModalProps {
  open: boolean;
  onClose: () => void;
  tache: any | null;
  onUpdate?: () => void;
}

type HistoriqueAvecUtilisateur = HistoriqueVulnerabilite & {
  utilisateur: { prenom: string; nom: string } | null;
};

export default function PlanCorrectionDetailModal({
  open,
  onClose,
  tache,
  onUpdate,
}: PlanCorrectionDetailModalProps) {
  const { data: session } = useSession();
  
  const [history, setHistory] = useState<HistoriqueAvecUtilisateur[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<any>({});

  const userRole = session?.user?.role;
  const isCreator = tache?.createdBy === session?.user?.id;
  const canEdit = userRole === 'ADMIN' || (userRole === 'AUDITEUR' && isCreator);

  // Charger l'historique
  useEffect(() => {
    if (open && tache?.vulnerabilite?.id) {
      getVulnerabilityHistory(tache.vulnerabilite.id).then(setHistory);
    }
  }, [open, tache]);

  // Initialiser le formulaire en mode édition
  useEffect(() => {
    if (isEditing && tache) {
      setFormData({
        statut: tache.statut,
        priorite: tache.priorite,
        dateEcheance: tache.dateEcheance ? tache.dateEcheance.split('T')[0] : '',
        commentaire: tache.commentaire || '',
        assigneA: tache.assigneA || '',
      });
    }
  }, [isEditing, tache]);

  if (!open || !tache) return null;

  const vuln = tache.vulnerabilite;
  const plan = tache;

  const formatDate = (dateInput: string | Date): string => {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const severityClass = (s: Severite | string | null) => {
    if (!s) return 'bg-slate-600 text-slate-200';
    const severity = String(s).toUpperCase();
    switch (severity) {
      case 'CRITICAL': return 'bg-red-900 text-red-300 border-red-700';
      case 'HIGH': return 'bg-orange-900 text-orange-300 border-orange-700';
      case 'MEDIUM': return 'bg-yellow-900 text-yellow-300 border-yellow-700';
      case 'LOW': return 'bg-emerald-900 text-emerald-300 border-emerald-700';
      default: return 'bg-slate-600 text-slate-200';
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/plans-correction/${plan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statut: formData.statut,
          priorite: formData.priorite,
          dateEcheance: formData.dateEcheance || undefined,
          commentaire: formData.commentaire,
          assigneA: formData.assigneA || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de la mise à jour");
      }

      alert("Plan mis à jour avec succès !");
      setIsEditing(false);
      onUpdate?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Voulez-vous vraiment supprimer ce plan de correction ? Cette action est irréversible.")) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/plans-correction/${plan.id}`, { method: 'DELETE' });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de la suppression");
      }

      alert("Plan supprimé avec succès");
      onClose();
      onUpdate?.();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
        
        {/* En-tête */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              {vuln.titre}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Plan de Correction • {plan.priorite}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {canEdit && !isEditing && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition"
                >
                  <Edit3 className="w-4 h-4" />
                  Modifier
                </button>
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition"
                >
                  <Trash2 className="w-4 h-4" />
                  Supprimer
                </button>
              </>
            )}

            <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-8">
          {isEditing ? (
            /* ==================== FORMULAIRE D'ÉDITION ==================== */
            <div className="space-y-6">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Edit3 className="w-5 h-5" /> Modifier le Plan
              </h3>

              {error && <p className="text-red-500 bg-red-50 p-3 rounded-lg">{error}</p>}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Statut</label>
                  <select
                    value={formData.statut}
                    onChange={(e) => setFormData({ ...formData, statut: e.target.value })}
                    className="w-full border rounded-lg p-3"
                  >
                    <option value="A_FAIRE">À Faire</option>
                    <option value="EN_COURS">En Cours</option>
                    <option value="TERMINE">Terminé</option>
                    <option value="ANNULE">Annulé</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Priorité</label>
                  <select
                    value={formData.priorite}
                    onChange={(e) => setFormData({ ...formData, priorite: e.target.value })}
                    className="w-full border rounded-lg p-3"
                  >
                    <option value="HAUTE">Haute</option>
                    <option value="MOYENNE">Moyenne</option>
                    <option value="BASSE">Basse</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Date d'échéance</label>
                  <input
                    type="date"
                    value={formData.dateEcheance}
                    onChange={(e) => setFormData({ ...formData, dateEcheance: e.target.value })}
                    className="w-full border rounded-lg p-3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Réassigner à (ID Technicien)</label>
                  <input
                    type="text"
                    value={formData.assigneA}
                    onChange={(e) => setFormData({ ...formData, assigneA: e.target.value })}
                    placeholder="ID du technicien"
                    className="w-full border rounded-lg p-3"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Commentaire</label>
                <textarea
                  value={formData.commentaire}
                  onChange={(e) => setFormData({ ...formData, commentaire: e.target.value })}
                  rows={5}
                  className="w-full border rounded-lg p-3"
                  placeholder="Ajouter un commentaire..."
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  <Save className="w-5 h-5" />
                  {loading ? "Enregistrement..." : "Enregistrer les modifications"}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 border border-slate-300 dark:border-slate-600 py-3 rounded-xl"
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            /* ==================== MODE AFFICHAGE ==================== */
            <>
              {/* Détails Vulnérabilité */}
              <div>
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Détails de la Vulnérabilité
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-950 p-5 rounded-xl">
                  <div className="space-y-3">
                    <p><strong>CVE :</strong> {vuln.cveId || 'N/A'}</p>
                    <p>
                      <strong>Sévérité :</strong>{' '}
                      <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full border ${severityClass(vuln.severite)}`}>
                        {vuln.severite}
                      </span>
                    </p>
                    <p><strong>Score CVSS :</strong> {vuln.scoreCVSS ?? '-'}</p>
                    <p><strong>Risque Relatif :</strong> {vuln.risqueRelatif?.toFixed(1) ?? '-'}</p>
                  </div>
                  <div>
                    <p className="font-medium mb-2">Recommandation :</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line">
                      {vuln.recommandation || "Aucune recommandation disponible."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Plan de Correction */}
              <div>
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Plan de Correction
                </h3>
                <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-xl space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <p className="text-xs text-slate-500">Priorité</p>
                      <p className="text-lg font-semibold capitalize">{plan.priorite}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Date d'échéance</p>
                      <p className="text-lg font-semibold">
                        {new Date(plan.dateEcheance).toLocaleDateString('fr-FR', {
                          day: 'numeric', month: 'long', year: 'numeric'
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Statut</p>
                      <p className="text-lg font-semibold capitalize text-emerald-500">
                        {plan.statut}
                      </p>
                    </div>
                  </div>

                  {plan.description && (
                    <div>
                      <p className="text-xs text-slate-500 mb-2">Description / Actions correctives</p>
                      <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700 text-sm whitespace-pre-line">
                        {plan.description}
                      </div>
                    </div>
                  )}

                  {plan.commentaire && (
                    <div>
                      <p className="text-xs text-slate-500 mb-2">Commentaire</p>
                      <p className="italic text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-4 rounded-lg border">
                        {plan.commentaire}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Historique */}
              <div>
                <h3 className="font-semibold text-lg mb-4">Historique des modifications</h3>
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-slate-50 dark:bg-slate-950 max-h-80 overflow-y-auto">
                  {history.length === 0 ? (
                    <p className="text-slate-500 text-center py-10">Aucun historique disponible</p>
                  ) : (
                    history.map((entry) => (
                      <div key={entry.id} className="mb-5 last:mb-0 pb-5 border-b border-slate-200 dark:border-slate-700 last:border-none">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">
                            {entry.utilisateur?.prenom} {entry.utilisateur?.nom}
                          </span>
                          <span className="text-slate-500">{formatDate(entry.dateModification)}</span>
                        </div>
                        <p className="mt-1 text-sm">
                          <span className="line-through text-slate-400">{entry.ancienStatut}</span>
                          {' → '}
                          <strong className="text-blue-600 dark:text-blue-400">{entry.nouveauStatut}</strong>
                        </p>
                        {entry.commentaire && (
                          <p className="mt-2 text-sm italic bg-white dark:bg-slate-900 p-3 rounded border">
                            {entry.commentaire}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Pied de page */}
        <div className="border-t border-slate-200 dark:border-slate-700 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}