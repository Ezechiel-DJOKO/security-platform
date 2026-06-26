'use client';
import { useState, useEffect } from 'react';
import { FileText, Download, AlertCircle, Award } from 'lucide-react';
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

  // Récupérer les plans terminés directement
  const fetchRapports = async () => {
    try {
      const res = await fetch('/api/reports/technicien/plans-termines'); // Nouvelle route simple
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRapports(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger les rapports");
    } finally {
      setLoading(false);
    }
  };

  // Télécharger un rapport individuel
  const downloadIndividualReport = async (planId: string, titre: string) => {
    toast.loading("Génération du rapport...", { id: planId });
    try {
      const res = await fetch(`/api/reports/technicien/plan/${planId}`);
      if (!res.ok) throw new Error();
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Correction_${titre.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success("Rapport téléchargé !", { id: planId });
    } catch {
      toast.error("Erreur lors de la génération", { id: planId });
    }
  };

  // Rapport Final Global (inchangé)
  const downloadFinalReport = async () => {
    toast.loading("Génération du rapport final...", { id: "final" });
    try {
      const res = await fetch('/api/reports/technicien/final');
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Rapport_Final_Activite_${new Date().toISOString().slice(0,10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Rapport final téléchargé !", { id: "final" });
    } catch {
      toast.error("Erreur lors de la génération", { id: "final" });
    }
  };

  useEffect(() => {
    fetchRapports();
  }, []);

  if (loading) return <div className="text-slate-400 py-12 text-center">Chargement...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold flex items-center gap-3">
          <FileText className="text-purple-400" />
          Mes Rapports
        </h2>
        <button
          onClick={downloadFinalReport}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl text-white font-medium hover:brightness-110 transition"
        >
          <Award className="h-5 w-5" />
          Mon Rapport Final d’Activité
        </button>
      </div>

      {rapports.length === 0 ? (
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-16 text-center">
          <AlertCircle className="h-16 w-16 mx-auto text-slate-400 mb-6" />
          <h3 className="text-xl font-semibold text-white">Aucun rapport disponible</h3>
          <p className="text-slate-400 mt-3">
            Les rapports de vos plans de correction terminés apparaîtront ici.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {rapports.map((r) => (
            <div key={r.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-600 transition-all">
              <div className="flex flex-col md:flex-row justify-between gap-6">
                <div className="flex items-start gap-4">
                  <FileText className="h-10 w-10 text-purple-400 mt-1" />
                  <div>
                    <h3 className="font-semibold text-white">{r.titre}</h3>
                    <p className="text-xs text-slate-500 mt-2">
                      {new Date(r.genereLe).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
                <div>
                  <button
                    onClick={() => downloadIndividualReport(r.id, r.titre)}
                    className="flex items-center gap-2 px-5 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm transition"
                  >
                    <Download className="h-4 w-4" />
                    Télécharger PDF
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}