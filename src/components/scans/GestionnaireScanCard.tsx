'use client';
import { useTransition, useState, useEffect, useCallback, useRef } from 'react';
import { lancerScanAction } from '@/app/actions/scan-actions';
import { OutilScan, TypeActif } from '@prisma/client';

interface ScanStatus {
  id: string;
  statut: string;
  [key: string]: unknown;
}

interface GestionnaireScanCardProps {
  idActif: string;
  nomActif?: string;
  adresseIP?: string;
  typeActif: TypeActif;           // Obligatoire maintenant
  scanIdEnCours?: string;
}

export default function GestionnaireScanCard({
  idActif,
  nomActif,
  adresseIP,
  typeActif,
  scanIdEnCours: initialScanId
}: GestionnaireScanCardProps) {

  const [isPending, startTransition] = useTransition();
  const [outilSelectionne, setOutilSelectionne] = useState<OutilScan>(OutilScan.NUCLEI);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [scanEnCours, setScanEnCours] = useState<ScanStatus | null>(null);
  const [currentScanId, setCurrentScanId] = useState<string | undefined>(undefined);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const initialScanIdRef = useRef(initialScanId);

  // Recommandation intelligente selon le type d'actif
  const getRecommendedTool = (type: TypeActif): OutilScan => {
    switch (type) {
      case 'SERVEUR':
      case 'BDD':
        return OutilScan.NUCLEI;
      case 'FIREWALL':
      case 'ROUTER':
        return OutilScan.OPENVAS;
      case 'APPLICATION':
        return OutilScan.ZAP;
      case 'CLOUD':
        return OutilScan.NUCLEI;
      case 'WORKSTATION':
        return OutilScan.NUCLEI;
      default:
        return OutilScan.NUCLEI;
    }
  };

  // Initialisation de l'outil recommandé
  useEffect(() => {
    const recommended = getRecommendedTool(typeActif);
    setOutilSelectionne(recommended);
  }, [typeActif]);

  // Fetch scan status
  const fetchScanStatus = useCallback(async (scanId: string) => {
    if (!scanId || !isMountedRef.current) return;
    try {
      const res = await fetch(`/api/scans/${scanId}`, { cache: 'no-store' });
      if (!res.ok) return;

      const data = await res.json();
      if (isMountedRef.current) {
        setScanEnCours(data.scan || data);
        const status = data.scan?.statut || data.statut;
        if (status === 'TERMINE' || status === 'COMPLETED') {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      }
    } catch (error) {
      console.error('Error fetching scan status:', error);
    }
  }, []);

  // Polling
  useEffect(() => {
    isMountedRef.current = true;
    let intervalId: NodeJS.Timeout | null = null;

    const startPolling = () => {
      if (currentScanId && isMountedRef.current) {
        fetchScanStatus(currentScanId);
        intervalId = setInterval(() => {
          if (currentScanId && isMountedRef.current) fetchScanStatus(currentScanId);
        }, 1500);
        intervalRef.current = intervalId;
      } else if (isMountedRef.current) {
        setScanEnCours(null);
      }
    };

    startPolling();

    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (intervalId) clearInterval(intervalId);
    };
  }, [currentScanId, fetchScanStatus]);

  // Handle initialScanId
  useEffect(() => {
    if (initialScanIdRef.current !== initialScanId) {
      initialScanIdRef.current = initialScanId;
      if (initialScanId) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (isMountedRef.current) setScanEnCours(null);
      }
    }
  }, [initialScanId]);

  const handleLancerScan = () => {
    startTransition(async () => {
      const result = await lancerScanAction(idActif, outilSelectionne);
      if (result.success && result.scanId) {
        setCurrentScanId(result.scanId);
        setMessage({ type: 'success', text: `Scan lancé avec succès ! ID: ${result.scanId}` });
      } else {
        setMessage({ type: 'error', text: result.error || 'Échec du lancement du scan' });
      }
    });
  };

  const getStatutInfo = (statut?: string) => {
    if (!statut) return { label: 'Aucun scan', color: 'bg-slate-700 text-slate-400' };
    switch (statut) {
      case 'EN_COURS': return { label: '🔄 En cours...', color: 'bg-blue-500/30 text-blue-400' };
      case 'TERMINE': case 'COMPLETED': return { label: '✅ Terminé', color: 'bg-emerald-500/30 text-emerald-400' };
      case 'PLANIFIE': case 'EN_ATTENTE': return { label: '⏳ En attente', color: 'bg-yellow-500/30 text-yellow-400' };
      case 'ECHEC': return { label: '❌ Échec', color: 'bg-red-500/30 text-red-400' };
      default: return { label: statut, color: 'bg-slate-700 text-slate-400' };
    }
  };

  const statutInfo = getStatutInfo(scanEnCours?.statut);
  const recommendedTool = getRecommendedTool(typeActif);

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

      {message && (
        <div className={`p-3 rounded-xl text-sm border ${
          message.type === 'success' ? 'bg-green-900/30 border-green-700 text-green-400' : 'bg-red-900/30 border-red-700 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-xs text-slate-400 block mb-1">Outil de scan</label>
          <select
            value={outilSelectionne}
            onChange={(e) => setOutilSelectionne(e.target.value as OutilScan)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value={OutilScan.NUCLEI}>🔍 Nuclei (Web & Network)</option>
            <option value={OutilScan.OPENVAS}>🛡️ OpenVAS (Réseau)</option>
            <option value={OutilScan.GRYPE}>📦 Grype (Containers)</option>
            <option value={OutilScan.ZAP}>⚡ OWASP ZAP (Web App)</option>
            <option value={OutilScan.BURP_SUITE}>🕵️ Burp Suite</option>
            <option value={OutilScan.TRIVY}>🐳 Trivy</option>
            <option value={OutilScan.NESSUS}>📊 Nessus</option>
            <option value={OutilScan.QUALYS}>☁️ Qualys</option>
            <option value={OutilScan.MANUAL}>✍️ Manuel</option>
          </select>
          {outilSelectionne !== recommendedTool && (
            <p className="text-amber-400 text-xs mt-1">⚠️ Outil recommandé pour ce type d’actif : {recommendedTool}</p>
          )}
        </div>

        <button
          onClick={handleLancerScan}
          disabled={isPending}
          className="flex-1 self-end py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
        >
          {isPending ? '⏳ Lancement...' : '🚀 Lancer le Scan'}
        </button>
      </div>
    </div>
  );
}