'use client';
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { TypeActif, NiveauCriticite } from '@prisma/client';

interface ActifModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  initialData?: any;
  mode: 'create' | 'edit';
}

export default function ActifModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  mode
}: ActifModalProps) {
  const [formData, setFormData] = useState({
    nom: initialData?.nom || '',
    type: initialData?.type || 'SERVEUR',
    adresseIP: initialData?.adresseIP || '',
    hostname: initialData?.hostname || '',
    localisation: initialData?.localisation || '',
    criticite: initialData?.criticite || '',   // ← Vide par défaut
  });

  // Mise à jour des données en mode édition
  useEffect(() => {
    if (initialData) {
      setFormData({
        nom: initialData.nom || '',
        type: initialData.type || 'SERVEUR',
        adresseIP: initialData.adresseIP || '',
        hostname: initialData.hostname || '',
        localisation: initialData.localisation || '',
        criticite: initialData.criticite || '',
      });
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">
            {mode === 'create' ? 'Nouvel Actif' : 'Modifier Actif'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-slate-400 text-sm block mb-1">Nom de l’Actif *</label>
            <input
              type="text"
              required
              value={formData.nom}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
              placeholder="Serveur Production Principal"
            />
          </div>

          <div>
            <label className="text-slate-400 text-sm block mb-1">Type d'Actif *</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as TypeActif })}
              className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
              required
            >
              <option value="SERVEUR">Serveur</option>
              <option value="WORKSTATION">Poste de Travail</option>
              <option value="FIREWALL">Firewall</option>
              <option value="ROUTER">Routeur</option>
              <option value="APPLICATION">Application</option>
              <option value="BDD">Base de Données</option>
              <option value="CLOUD">Service Cloud</option>
              <option value="AUTRE">Autre</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <label className="text-slate-400 text-sm block mb-1">Hostname</label>
              <input
                type="text"
                value={formData.hostname}
                onChange={(e) => setFormData({ ...formData, hostname: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-white"
                placeholder="prod-srv-01"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 text-sm block mb-1">Localisation / Site</label>
            <input
              type="text"
              value={formData.localisation}
              onChange={(e) => setFormData({ ...formData, localisation: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-white"
              placeholder="Datacenter Principal - Rack 12"
            />
          </div>

          {/* Criticité - Optionnel maintenant */}
          <div>
            <label className="text-slate-400 text-sm block mb-1">Criticité</label>
            <select
              value={formData.criticite}
              onChange={(e) => setFormData({ ...formData, criticite: e.target.value as NiveauCriticite })}
              className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">Non définie (à évaluer)</option>
              <option value="CRITIQUE">Critique</option>
              <option value="ELEVE">Élevé</option>
              <option value="MOYEN">Moyen</option>
              <option value="BAS">Faible</option>
            </select>
            <p className="text-xs text-slate-500 mt-1">Optionnel - Peut être défini après scan</p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-slate-700 rounded-2xl text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 rounded-2xl text-white font-medium transition-colors"
            >
              {mode === 'create' ? 'Créer l’Actif' : 'Enregistrer les modifications'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}