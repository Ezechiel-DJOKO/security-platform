'use client';
import { useTransition, useState, useEffect } from 'react';
import { lancerScanAction } from '@/app/actions/scan-actions';
import { OutilScan } from '@prisma/client';

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
      const res = await fetch(`/api/scans/${scanIdEnCours}`, { 
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (!res.ok) return;
      
      const data = await res.json();
      const scanData = data.scan || data;
      setScanEnCours(scanData);
    } catch (error) {
      console.error("Erreur fetch statut:", error);
    }
  };

  useEffect(() => {
    if (!scanIdEnCours) return;
    fetchScanStatus();
    const interval = setInterval(fetchScanStatus, 3000);
    return () => clearInterval(interval);
  }, [scanIdEnCours]);

  const handleLancerScan = () => {
    startTransition(async () => {
      const result = await lancerScanAction(idActif, outilSelectionne);
      if (result.success) {
        setMessage({ type: 'success', text: `Scan lancé ! ID: ${result.scanId}` });
      } else {
        setMessage({ type: 'error', text: result.error || 'Échec du lancement' });
      }
    });
  };

  const statut = scanEnCours?.statut || null;

  return (
    <div className="w-full space-y-4">
      {scanEnCours && (
        <div className="p-4 bg-slate-800 rounded-xl border border-slate-700">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Statut actuel :</span>
            <span className={`px-4 py-1 rounded-full text-sm font-medium ${
              statut === 'EN_COURS' ? 'bg-yellow-500/30 text-yellow-400' :
              statut === 'TERMINE' ? 'bg-emerald-500/30 text-emerald-400' : 
              'bg-blue-500/30 text-blue-400'
            }`}>
              {statut === 'EN_ATTENTE' && '⏳ En attente'}
              {statut === 'EN_COURS' && '🔄 En cours...'}
              {statut === 'TERMINE' && '✅ Terminé'}
              {!statut && 'Chargement...'}
            </span>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <select 
          value={outilSelectionne}
          onChange={(e) => setOutilSelectionne(e.target.value as OutilScan)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2"
        >
          <option value={OutilScan.NUCLEI}>Nuclei</option>
          <option value={OutilScan.OPENVAS}>OpenVAS</option>
          <option value={OutilScan.GRYPE}>Grype</option>
        </select>

        <button
          onClick={handleLancerScan}
          disabled={isPending}
          className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isPending ? '⏳ Lancement en cours...' : '⚡ Démarrer le Scan'}
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-xl ${
          message.type === 'success' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
        }`}>
          {message.text}
        </div>
      )}
    </div>
  );
}