'use client';
import { useState, useEffect } from 'react';
import { FileText, Download, AlertCircle, Award, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';

type Rapport = {
  id: string;
  titre: string;
  genereLe: string;
  concerneVulnerabilite?: string;
};

export default function RapportsTechnicien() {
  const [rapports, setRapports] = useState<Rapport[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchRapports = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/reports/technicien/plans-termines');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRapports(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      toast.error('Impossible de charger les rapports');
    } finally {
      setLoading(false);
    }
  };

  // Helper unique pour tous les téléchargements PDF
  const downloadPdf = async (url: string, filename: string, toastId: string) => {
    setDownloadingId(toastId);
    toast.loading('Génération du rapport...', { id: toastId });
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success('Rapport téléchargé !', { id: toastId });
    } catch {
      toast.error('Erreur lors de la génération', { id: toastId });
    } finally {
      setDownloadingId(null);
    }
  };

  const downloadIndividualReport = (planId: string, titre: string) =>
    downloadPdf(
      `/api/reports/technicien/plan/${planId}`,
      `Correction_${titre.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
      planId
    );

  const downloadFinalReport = () =>
    downloadPdf(
      '/api/reports/technicien/final',
      `Rapport_Final_Activite_${new Date().toISOString().slice(0, 10)}.pdf`,
      'final'
    );

  useEffect(() => {
    fetchRapports();
  }, []);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <h2 className="text-2xl font-semibold flex items-center gap-3 text-white">
          <FileText className="text-purple-400" />
          Mes Rapports
        </h2>
        <button
          onClick={downloadFinalReport}
          disabled={downloadingId === 'final'}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl text-white font-medium hover:brightness-110 transition disabled:opacity-50"
        >
          {downloadingId === 'final' ? (
            <RefreshCw className="h-5 w-5 animate-spin" />
          ) : (
            <Award className="h-5 w-5" />
          )}
          Rapport Final d’Activité
        </button>
      </div>

      {/* Contenu */}
      {loading ? (
        <div className="text-slate-400 py-12 text-center">Chargement des rapports...</div>
      ) : rapports.length === 0 ? (
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-16 text-center">
          <AlertCircle className="h-16 w-16 mx-auto text-slate-400 mb-6" />
          <h3 className="text-xl font-semibold text-white">Aucun rapport disponible</h3>
          <p className="text-slate-400 mt-3">
            Les rapports de vos plans de correction terminés apparaîtront ici.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {rapports.map((r) => {
            const isDownloading = downloadingId === r.id;
            return (
              <div
                key={r.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-600 transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 bg-purple-500/10 rounded-xl">
                      <FileText className="h-7 w-7 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{r.titre}</h3>
                      {r.concerneVulnerabilite && (
                        <p className="text-xs text-slate-400 mt-1">
                          {r.concerneVulnerabilite}
                        </p>
                      )}
                      <p className="text-xs text-slate-500 mt-1.5">
                        Généré le {new Date(r.genereLe).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => downloadIndividualReport(r.id, r.titre)}
                    disabled={isDownloading}
                    className="flex items-center justify-center gap-2 px-5 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm transition disabled:opacity-50 shrink-0"
                  >
                    {isDownloading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    Télécharger PDF
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}