'use client';
import { useState } from 'react';
import { X } from 'lucide-react';

interface ActifModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  initialData?: any;
  mode: 'create' | 'edit';
}

export default function ActifModal({ isOpen, onClose, onSubmit, initialData, mode }: ActifModalProps) {
  const [formData, setFormData] = useState({
    nom: initialData?.nom || '',
    type: initialData?.type || 'SERVEUR',
    adresseIP: initialData?.adresseIP || '',
    hostname: initialData?.hostname || '',
    criticite: initialData?.criticite || 'MOYEN',
    localisation: initialData?.localisation || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">
            {mode === 'create' ? 'Nouvel Actif' : 'Modifier Actif'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-slate-400 text-sm block mb-1">Nom de l’Actif</label>
            <input
              type="text"
              required
              value={formData.nom}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-slate-400 text-sm block mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-white"
              >
                <option value="SERVEUR">Serveur</option>
                <option value="WORKSTATION">Poste de travail</option>
                <option value="FIREWALL">Firewall</option>
                <option value="ROUTER">Routeur</option>
                <option value="BDD">Base de données</option>
                <option value="CLOUD">Cloud</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 text-sm block mb-1">Criticité</label>
              <select
                value={formData.criticite}
                onChange={(e) => setFormData({ ...formData, criticite: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-white"
              >
                <option value="CRITIQUE">Critique</option>
                <option value="ELEVE">Élevé</option>
                <option value="MOYEN">Moyen</option>
                <option value="BAS">Faible</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-slate-400 text-sm block mb-1">Adresse IP</label>
            <input
              type="text"
              value={formData.adresseIP}
              onChange={(e) => setFormData({ ...formData, adresseIP: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-white"
              placeholder="192.168.10.45"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-slate-700 rounded-2xl text-slate-300 hover:bg-slate-800"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 rounded-2xl text-white font-medium"
            >
              {mode === 'create' ? 'Créer l’Actif' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}