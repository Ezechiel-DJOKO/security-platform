'use client';

import { useTransition, useState, useEffect, useCallback, useRef } from 'react';
import { lancerScanAction } from '@/app/actions/scan-actions';
import { OutilScan } from '@prisma/client';

// Define the type for scan status
interface ScanStatus {
  id: string;
  statut: string;
  [key: string]: unknown; // For any other properties
}

interface GestionnaireScanCardProps {
  idActif: string;
  nomActif: string; // Keep this as it might be used in parent components
  adresseIP: string; // Keep this as it might be used in parent components
  scanIdEnCours?: string;
}

export default function GestionnaireScanCard({ 
  idActif, 
  // These props are intentionally unused but kept for component interface compatibility
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  nomActif, 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  adresseIP, 
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

  // Define fetchScanStatus with useCallback
  const fetchScanStatus = useCallback(async (scanId: string) => {
    if (!scanId || !isMountedRef.current) return;
    
    try {
      const res = await fetch(`/api/scans/${scanId}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      
      // Only update if component is still mounted
      if (isMountedRef.current) {
        setScanEnCours(data.scan || data);
        
        // If scan is completed, stop polling
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

  // Set up polling for scan status
  useEffect(() => {
    isMountedRef.current = true;
    
    let intervalId: NodeJS.Timeout | null = null;

    const startPolling = () => {
      if (currentScanId && isMountedRef.current) {
        // Initial fetch
        fetchScanStatus(currentScanId);
        
        // Set up interval
        intervalId = setInterval(() => {
          if (currentScanId && isMountedRef.current) {
            fetchScanStatus(currentScanId);
          }
        }, 1500);
        
        intervalRef.current = intervalId;
      } else {
        // No scan ID, clear state - but only if mounted
        if (isMountedRef.current) {
          setScanEnCours(null);
        }
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    };

    startPolling();

    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [currentScanId, fetchScanStatus]);

  // Reset scan when initialScanId changes - use a ref and a separate effect with cleanup
  useEffect(() => {
    // Only run if the initialScanId has actually changed
    if (initialScanIdRef.current !== initialScanId) {
      initialScanIdRef.current = initialScanId;
      
      if (initialScanId) {
        // If there's an active interval, clear it
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        // Reset the current scan state - only if mounted
        if (isMountedRef.current) {
          setScanEnCours(null);
        }
      }
    }
  }, [initialScanId]);

  // Separate effect to handle cleanup when component unmounts
  useEffect(() => {
    return () => {
      // Clear any pending intervals
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

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
          className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 flex-1 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          aria-label="Sélectionner l'outil de scan"
        >
          <option value={OutilScan.NUCLEI}>Nuclei</option>
          <option value={OutilScan.OPENVAS}>OpenVAS</option>
          <option value={OutilScan.GRYPE}>Grype</option>
        </select>

        <button
          onClick={handleLancerScan}
          disabled={isPending}
          className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
          aria-label="Lancer le scan"
        >
          {isPending ? '⏳ Lancement...' : '⚡ Démarrer le Scan'}
        </button>
      </div>
    </div>
  );
}