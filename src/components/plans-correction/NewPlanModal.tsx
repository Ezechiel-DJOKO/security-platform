'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface Vulnerability {
  id: string;
  cveId: string | null;
  titre: string;
  severite: string | null;
  statut: string;
  risqueRelatif?: number | null;
  scoreCVSS?: number | null;
}

interface User {
  id: string;
  nom: string;
  prenom: string;
  email: string;
}

interface NewPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function NewPlanModal({ isOpen, onClose, onSuccess }: NewPlanModalProps) {
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [techniciens, setTechniciens] = useState<User[]>([]);
  const [selectedVulns, setSelectedVulns] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    assigneA: '',
    priorite: 'HAUTE',
    dateEcheance: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);

    // Récupération de TOUTES les vulnérabilités
    fetch('/api/vulnerabilities?all=true')
      .then(r => r.json())
      .then(d => {
        setVulnerabilities(d.data || []);
      })
      .catch(err => console.error('Erreur chargement vulnérabilités:', err))
      .finally(() => setLoading(false));

    // Chargement des techniciens
    fetch('/api/users?role=TECHNICIEN')
      .then(r => r.json())
      .then(d => setTechniciens(d.data || []))
      .catch(() => {});
  }, [isOpen]);

  const toggleVuln = (id: string) => {
    setSelectedVulns(prev =>
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedVulns.length === 0) {
      alert("Veuillez sélectionner au moins une vulnérabilité");
      return;
    }
    if (!formData.assigneA) {
      alert("Veuillez sélectionner un technicien");
      return;
    }
    if (!formData.dateEcheance) {
      alert("Veuillez choisir une date d'échéance");
      return;
    }

    try {
      const res = await fetch('/api/plans-correction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vulnerabiliteIds: selectedVulns,
          assigneA: formData.assigneA,
          priorite: formData.priorite,
          dateEcheance: formData.dateEcheance,
          description: formData.description,
        }),
      });

      if (res.ok) {
        alert(`${selectedVulns.length} plan(s) de correction créé(s) avec succès !`);
        onSuccess();
        onClose();
        setSelectedVulns([]); // Reset
      } else {
        const err = await res.json();
        alert(err.error || 'Erreur lors de la création');
      }
    } catch (err) {
      alert('Erreur de connexion au serveur');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-950 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-slate-800">
          <h2 className="text-2xl font-semibold text-white">Nouveau Plan de Correction</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-auto max-h-[calc(92vh-80px)]">
          {/* Vulnérabilités */}
          <div>
            <label className="block text-sm text-slate-400 mb-3">
              Vulnérabilités à inclure <span className="text-red-500">*</span>
            </label>

            <div className="max-h-72 overflow-y-auto border border-slate-700 rounded-lg p-3 bg-slate-900">
              {loading ? (
                <p className="text-slate-500 py-12 text-center">Chargement des vulnérabilités...</p>
              ) : vulnerabilities.length === 0 ? (
                <p className="text-slate-500 py-12 text-center">Aucune vulnérabilité disponible</p>
              ) : (
                vulnerabilities.map((vuln) => (
                  <label
                    key={vuln.id}
                    className="flex items-start gap-3 p-3 hover:bg-slate-800 rounded cursor-pointer border-b border-slate-800 last:border-none"
                  >
                    <input
                      type="checkbox"
                      checked={selectedVulns.includes(vuln.id)}
                      onChange={() => toggleVuln(vuln.id)}
                      className="mt-1 accent-blue-600"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-100 truncate">
                        {vuln.cveId || 'N/A'} — {vuln.titre}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                        <span className={`font-medium ${vuln.severite === 'CRITICAL' ? 'text-red-400' : 
                          vuln.severite === 'HIGH' ? 'text-orange-400' : 'text-yellow-400'}`}>
                          {vuln.severite}
                        </span>
                        <span>•</span>
                        <span>{vuln.statut}</span>
                        {vuln.risqueRelatif && (
                          <span className="font-mono">• Risque: {vuln.risqueRelatif}</span>
                        )}
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>

            <p className="text-xs text-slate-500 mt-2">
              {selectedVulns.length} vulnérabilité(s) sélectionnée(s)
            </p>
          </div>

          {/* Technicien */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              Technicien responsable <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.assigneA}
              onChange={(e) => setFormData({ ...formData, assigneA: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 focus:border-blue-500"
              required
            >
              <option value="">Sélectionner un technicien...</option>
              {techniciens.map(t => (
                <option key={t.id} value={t.id}>
                  {t.prenom} {t.nom} — {t.email}
                </option>
              ))}
            </select>
          </div>

          {/* Priorité + Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Priorité</label>
              <select
                value={formData.priorite}
                onChange={(e) => setFormData({ ...formData, priorite: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3"
              >
                <option value="CRITIQUE">Critique</option>
                <option value="HAUTE">Haute</option>
                <option value="MOYENNE">Moyenne</option>
                <option value="BASSE">Basse</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">Date d'échéance <span className="text-red-500">*</span></label>
              <input
                type="date"
                value={formData.dateEcheance}
                onChange={(e) => setFormData({ ...formData, dateEcheance: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3"
                required
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">Description / Actions correctives</label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Détails des mesures à prendre, priorités, etc."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-slate-700 rounded-lg hover:bg-slate-900 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={selectedVulns.length === 0 || !formData.assigneA}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-medium transition"
            >
              Créer {selectedVulns.length > 1 ? 'les Plans' : 'le Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}