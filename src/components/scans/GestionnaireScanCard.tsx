'use client';
import { useTransition, useState, useEffect } from 'react';
import { lancerScanAction, annulerScanAction } from '@/app/actions/scan-actions';
import { OutilScan, StatutScan } from '@prisma/client';

interface GestionnaireScanCardProps {
  idActif: string;
  scanIdEnCours?: string;
}

export default function GestionnaireScanCard({ idActif, scanIdEnCours }: GestionnaireScanCardProps) {
  const [isPending, startTransition] = useTransition();
  const [outilSelectionne, setOutilSelectionne] = useState<OutilScan>(OutilScan.NUCLEI);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [scanEnCours, setScanEnCours] = useState<any>(null);

  const fetchScanStatus = async () => {
    if (!scanIdEnCours) return;

    try {
      const res = await fetch(`/api/scans/${scanIdEnCours}`, { cache: 'no-store' });

      if (!res.ok) {
        console.warn(`HTTP ${res.status} pour scan ${scanIdEnCours}`);
        return;
      }

      const text = await res.text();
      if (!text || text.trim() === '') return;

      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("Réponse non-JSON reçue");
        return;
      }

      const scanData = data.scan || data;
      setScanEnCours(scanData);

    } catch (error) {
      console.error("Erreur fetch statut:", error);
    }
  };

  useEffect(() => {
    if (!scanIdEnCours) return;
    fetchScanStatus();
    const interval = setInterval(fetchScanStatus, 4000);
    return () => clearInterval(interval);
  }, [scanIdEnCours]);

  const handleLancerScan = () => {
    startTransition(async () => {
      const result = await lancerScanAction(idActif, outilSelectionne);
      if (result.success) {
        setMessage({ type: 'success', text: `Scan lancé (ID: ${result.scanId})` });
      } else {
        setMessage({ type: 'error', text: result.error || 'Erreur' });
      }
    });
  };

  const statut = scanEnCours?.statut || null;

  return (
    <div className="w-full space-y-4">
      {scanEnCours && (
        <div className="p-4 bg-slate-800 rounded-xl border border-slate-700">
          <div className="flex justify-between">
            <span>Statut du scan :</span>
            <span className={`px-4 py-1 rounded-full text-sm font-medium ${
              statut === 'EN_COURS' ? 'bg-yellow-500/30 text-yellow-400' :
              statut === 'TERMINE' ? 'bg-emerald-500/30 text-emerald-400' : 'bg-gray-500/30 text-gray-400'
            }`}>
              {statut || 'Chargement...'}
            </span>
          </div>
        </div>
      )}

      <button
        onClick={handleLancerScan}
        disabled={isPending}
        className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isPending ? '⏳ Lancement...' : '⚡ Démarrer l\'analyse'}
      </button>

      {message && <div className={`p-3 rounded-lg ${message.type === 'success' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>{message.text}</div>}
    </div>
  );
}
