'use client';

import { useTransition, useState, useEffect } from 'react';
import { lancerScanAction } from '@/app/actions/scan-actions';
import { OutilScan } from '@prisma/client';

interface GestionnaireScanCardProps {
  idActif: string;
  nomActif: string;
  adresseIP: string;
  scanIdEnCours?: string;   // Dernier scan connu
}

export default function GestionnaireScanCard({ 
  idActif, 
  nomActif, 
  adresseIP, 
  scanIdEnCours: initialScanId 
}: GestionnaireScanCardProps) {
  
  const [isPending, startTransition] = useTransition();
  const [outilSelectionne, setOutilSelectionne] = useState<OutilScan>(OutilScan.NUCLEI);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [scanEnCours, setScanEnCours] = useState<any>(null);
  const [currentScanId, setCurrentScanId] = useState<string | undefined>(undefined); // On force à undefined au départ

  // Charger le statut seulement si un scan est en cours
  const fetchScanStatus = async (scanId: string) => {
    if (!scanId) return;
    try {
      const res = await fetch(`/api/scans/${scanId}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setScanEnCours(data.scan || data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (currentScanId) {
      fetchScanStatus(currentScanId);
      const interval = setInterval(() => fetchScanStatus(currentScanId), 1500);
      return () => clearInterval(interval);
    } else {
      setScanEnCours(null);
    }
  }, [currentScanId]);

  // Au chargement, on n'affiche pas l'ancien scan terminé
  useEffect(() => {
    if (initialScanId) {
      // On peut garder l'ancien scan en mémoire mais ne pas l'afficher immédiatement
      setScanEnCours(null);
    }
  }, [initialScanId]);

  const handleLancerScan = () => {
    startTransition(async () => {
      const result = await lancerScanAction(idActif, outilSelectionne);
      
      if (result.success && result.scanId) {
        setCurrentScanId(result.scanId);
        setMessage({ 
          type: 'success', 
          text: `Scan lancé avec succès ! ID: ${result.scanId}` 
        });
      } else {
        setMessage({ type: 'error', text: result.error || 'Échec du lancement' });
      }
    });
  };

  const getStatutInfo = (statut?: string) => {
    if (!statut) {
      return { label: 'Aucun scan', color: 'bg-slate-700 text-slate-400' };
    }
    switch (statut) {
      case 'EN_COURS':
        return { label: '🔄 En cours...', color: 'bg-blue-500/30 text-blue-400' };
      case 'TERMINE':
      case 'COMPLETED':
        return { label: '✅ Terminé', color: 'bg-emerald-500/30 text-emerald-400' };
      case 'EN_ATTENTE':
      case 'PLANIFIE':
        return { label: '⏳ En attente', color: 'bg-yellow-500/30 text-yellow-400' };
      default:
        return { label: statut, color: 'bg-slate-700 text-slate-400' };
    }
  };

  const statutInfo = getStatutInfo(scanEnCours?.statut);

  return (
    <div className="space-y-4">
      {/* Statut Actuel */}
      <div className="p-4 bg-slate-800 rounded-xl border border-slate-700">
        <div className="flex justify-between items-center">
          <span className="text-slate-400 text-sm">Statut actuel :</span>
          <span className={`px-4 py-1.5 rounded-full text-sm font-medium ${statutInfo.color}`}>
            {statutInfo.label}
          </span>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-3 rounded-xl text-sm border ${
          message.type === 'success' 
            ? 'bg-green-900/30 border-green-700 text-green-400' 
            : 'bg-red-900/30 border-red-700 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      {/* Contrôles */}
      <div className="flex gap-3">
        <select
          value={outilSelectionne}
          onChange={(e) => setOutilSelectionne(e.target.value as OutilScan)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 flex-1 text-white"
        >
          <option value={OutilScan.NUCLEI}>Nuclei</option>
          <option value={OutilScan.OPENVAS}>OpenVAS</option>
          <option value={OutilScan.GRYPE}>Grype</option>
        </select>

        <button
          onClick={handleLancerScan}
          disabled={isPending}
          className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 rounded-xl font-medium flex items-center justify-center gap-2"
        >
          {isPending ? '⏳ Lancement...' : '⚡ Démarrer le Scan'}
        </button>
      </div>
    </div>
  );
}