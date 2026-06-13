'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NewPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export default function NewPlanModal({ isOpen, onClose, onSubmit }: NewPlanModalProps) {
  const [formData, setFormData] = useState({
    vulnerabiliteId: '',
    priorite: 'HAUTE',
    assigneA: '',
    dateEcheance: '',
    description: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
    // Reset form
    setFormData({
      vulnerabiliteId: '',
      priorite: 'HAUTE',
      assigneA: '',
      dateEcheance: '',
      description: '',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-slate-950 border border-slate-700 rounded-2xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-800">
          <h2 className="text-2xl font-semibold">Nouveau Plan de Correction</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm text-slate-400 mb-2">Vulnérabilité</label>
            <input
              type="text"
              placeholder="CVE-XXXX-XXXX ou ID de la vulnérabilité"
              value={formData.vulnerabiliteId}
              onChange={(e) => setFormData({ ...formData, vulnerabiliteId: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Priorité</label>
              <select
                value={formData.priorite}
                onChange={(e) => setFormData({ ...formData, priorite: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
              >
                <option value="CRITIQUE">Critique</option>
                <option value="HAUTE">Haute</option>
                <option value="MOYENNE">Moyenne</option>
                <option value="BASSE">Basse</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">Date d'échéance</label>
              <input
                type="date"
                value={formData.dateEcheance}
                onChange={(e) => setFormData({ ...formData, dateEcheance: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Assigné à</label>
            <input
              type="text"
              placeholder="Nom de la personne responsable"
              value={formData.assigneA}
              onChange={(e) => setFormData({ ...formData, assigneA: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Description / Actions à mener</label>
            <textarea
              rows={4}
              placeholder="Décrivez les actions correctives à réaliser..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" className="flex-1">
              Créer le Plan
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}