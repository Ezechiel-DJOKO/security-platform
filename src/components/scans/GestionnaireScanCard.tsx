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
  const [loadingStatus, setLoadingStatus] = useState(false);

  // Fonction pour récupérer le statut actuel du scan
  const fetchScanStatus = async () => {
    if (!scanIdEnCours) return;
    
    setLoadingStatus(true);
    try {
      const res = await fetch(`/api/scans/${scanIdEnCours}`);
      if (!res.ok) throw new Error('Erreur lors de la récupération du statut');
      
      const data = await res.json();
      setScanEnCours(data);
      
      // Si le scan est terminé ou en échec, on arrête le polling
      if (data.statut === StatutScan.TERMINE || data.statut === StatutScan.ECHEC) {
        setMessage({ 
          type: data.statut === StatutScan.TERMINE ? 'success' : 'error', 
          text: `Scan ${data.statut === StatutScan.TERMINE ? 'terminé' : 'échoué'}` 
        });
      }
    } catch (error: any) {
      console.error("Erreur fetch statut:", error);
    } finally {
      setLoadingStatus(false);
    }
  };

  // Polling du statut toutes les 4 secondes quand un scan est en cours
  useEffect(() => {
    if (!scanIdEnCours) return;

    fetchScanStatus();
    const interval = setInterval(fetchScanStatus, 4000);
    
    return () => clearInterval(interval);
  }, [scanIdEnCours]);

  const handleLancerScan = () => {
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await lancerScanAction(idActif, outilSelectionne);
        
        if (result.success) {
          setMessage({ type: 'success', text: `Scan ${outilSelectionne} lancé avec succès !` });
          // Le scanIdEnCours sera mis à jour via revalidation dans la page parent
        } else {
          setMessage({ type: 'error', text: result.error || 'Une erreur est survenue.' });
        }
      } catch (error: any) {
        console.error("Erreur Server Action:", error);
        setMessage({ type: 'error', text: error?.message || "Erreur inattendue" });
      }
    });
  };

  const handleAnnulerScan = (id: string) => {
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await annulerScanAction(id);
        if (result.success) {
          setMessage({ type: 'success', text: 'Le scan a été annulé.' });
          setScanEnCours(null);
        } else {
          setMessage({ type: 'error', text: result.error || 'Impossible d\'annuler le scan.' });
        }
      } catch (error: any) {
        console.error("Erreur annulation:", error);
        setMessage({ type: 'error', text: error?.message || "Erreur lors de l'annulation" });
      }
    });
  };

  const statut = scanEnCours?.statut || 'AUCUN';

  return (
    <div className="w-full space-y-4">
      {/* Sélection d'outil (visible seulement si aucun scan en cours) */}
      {!scanIdEnCours && !scanEnCours && (
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
            <option value={OutilScan.GRYPE}>Grype (Conteneurs)</option>
            <option value={OutilScan.TRIVY}>Trivy (Sécurité Globale)</option>
          </select>
        </div>
      )}

      {/* Affichage du statut en cours */}
      {scanEnCours && (
        <div className="p-4 bg-slate-800 rounded-xl border border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Statut du scan :</span>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              statut === StatutScan.EN_COURS ? 'bg-yellow-500/20 text-yellow-400' :
              statut === StatutScan.TERMINE ? 'bg-emerald-500/20 text-emerald-400' :
              'bg-red-500/20 text-red-400'
            }`}>
              {statut}
            </span>
          </div>
        </div>
      )}

      {/* Boutons d'action */}
      <div className="flex items-center gap-3">
        {scanIdEnCours || scanEnCours ? (
          <button
            onClick={() => handleAnnulerScan(scanIdEnCours || scanEnCours?.id)}
            disabled={isPending}
            className="w-full px-4 py-2.5 text-sm font-medium bg-red-900/40 text-red-400 hover:bg-red-900/60 border border-red-800/60 rounded-xl disabled:opacity-40 transition-all flex items-center justify-center gap-2"
          >
            {isPending ? (
              <span className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
            ) : '🛑'} Annuler le Scan
          </button>
        ) : (
          <button
            onClick={handleLancerScan}
            disabled={isPending}
            className="w-full px-4 py-2.5 text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 border border-blue-700/50 rounded-xl shadow-lg shadow-blue-600/10 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
          >
            {isPending ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : '⚡'} Démarrer l&apos;analyse
          </button>
        )}
      </div>

      {/* Messages */}
      {message && (
        <div className={`p-3 rounded-lg text-xs font-medium border ${
          message.type === 'success' 
            ? 'bg-emerald-950/30 text-emerald-400 border-emerald-900/50' 
            : 'bg-red-950/30 text-red-400 border-red-900/50'
        }`}>
          {message.text}
        </div>
      )}
    </div>
  );
}