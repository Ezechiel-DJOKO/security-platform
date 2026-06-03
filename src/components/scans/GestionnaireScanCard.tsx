'use client';

import { useTransition, useState } from 'react';
import { lancerScanAction, annulerScanAction } from '@/app/actions/scan-actions';
import { OutilScan } from '@prisma/client';

interface GestionnaireScanCardProps {
  idActif: string;
  scanIdEnCours?: string;
}

export default function GestionnaireScanCard({ idActif, scanIdEnCours }: GestionnaireScanCardProps) {
  const [isPending, startTransition] = useTransition();
  const [outilSelectionne, setOutilSelectionne] = useState<OutilScan>(OutilScan.NUCLEI);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Déclencher un nouveau scan
  const handleLancerScan = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await lancerScanAction(idActif, outilSelectionne);
      if (result.success) {
        setMessage({ type: 'success', text: `Scan ${outilSelectionne} lancé avec succès !` });
      } else {
        setMessage({ type: 'error', text: result.error || 'Une erreur est survenue.' });
      }
    });
  };

  // Annuler le scan actif
  const handleAnnulerScan = (id: string) => {
    setMessage(null);
    startTransition(async () => {
      const result = await annulerScanAction(id);
      if (result.success) {
        setMessage({ type: 'success', text: 'Le scan a été marqué comme annulé.' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Impossible d\'annuler le scan.' });
      }
    });
  };

  return (
    <div className="w-full space-y-4">
      {/* Menu de sélection de l'outil (uniquement si aucun scan n'est en cours) */}
      {!scanIdEnCours && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            Sélectionner l&apos;outil de scan
          </label>
          <select
            value={outilSelectionne}
            onChange={(e) => setOutilSelectionne(e.target.value as OutilScan)}
            disabled={isPending}
            className="w-full px-3 py-2 text-sm bg-neutral-900 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
          >
            <option value={OutilScan.NUCLEI}>Nuclei (Vulnérabilités Web)</option>
            <option value={OutilScan.GRYPE}>Grype (Images Docker / Conteneurs)</option>
            <option value={OutilScan.TRIVY}>Trivy (Sécurité globale)</option>
          </select>
        </div>
      )}

      {/* Boutons d'action */}
      <div className="flex items-center gap-3">
        {scanIdEnCours ? (
          <button
            onClick={() => handleAnnulerScan(scanIdEnCours)}
            disabled={isPending}
            className="w-full px-4 py-2.5 text-sm font-medium bg-red-900/40 text-red-400 hover:bg-red-900/60 border border-red-800/60 rounded-xl disabled:opacity-40 transition-all flex items-center justify-center gap-2"
          >
            {isPending ? (
              <span className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
            ) : '🛑'}
            Annuler le Scan Actif
          </button>
        ) : (
          <button
            onClick={handleLancerScan}
            disabled={isPending}
            className="w-full px-4 py-2.5 text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 border border-blue-700/50 rounded-xl shadow-lg shadow-blue-600/10 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
          >
            {isPending ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : '⚡'}
            Démarrer l&apos;analyse
          </button>
        )}
      </div>

      {/* Notifications et messages de retour */}
      {message && (
        <div
          className={`p-3 rounded-lg text-xs font-medium border ${
            message.type === 'success'
              ? 'bg-emerald-950/30 text-emerald-400 border-emerald-900/50'
              : 'bg-red-950/30 text-red-400 border-red-900/50'
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}