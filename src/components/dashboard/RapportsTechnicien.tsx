'use client';
import { useState, useEffect } from 'react';
import { FileText, Download, Eye, Calendar, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

type RapportTechnicien = {
  id: string;
  titre: string;
  genereLe: string;
  format: string;
  type?: string;
  concerneVulnerabilite?: string;
};

export default function RapportsTechnicien() {
  const [rapports, setRapports] = useState<RapportTechnicien[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchRapports = async () => {
    try {
      setLoading(true);
      setError(false);

      const res = await fetch('/api/reports/export?mesRapports=true');

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const result = await res.json();

      // 🔧 Correction principale : gérer plusieurs formats de réponse
      let dataArray: RapportTechnicien[] = [];

      if (Array.isArray(result)) {
        dataArray = result;
      } else if (result.data && Array.isArray(result.data)) {
        dataArray = result.data;
      } else if (result.success && Array.isArray(result.data)) {
        dataArray = result.data;
      } else {
        console.warn("Format de réponse inattendu:", result);
        dataArray = [];
      }

      setRapports(dataArray);
    } catch (err) {
      console.error('Erreur chargement rapports:', err);
      setRapports([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRapports();
  }, []);

  if (loading) {
    return <div className="text-slate-400 py-12 text-center">Chargement de vos rapports...</div>;
  }

  if (error || rapports.length === 0) {
    return (
      <div className="bg-slate-950 border border-slate-800 rounded-3xl p-16 text-center">
        <AlertCircle className="h-16 w-16 mx-auto text-slate-400 mb-6" />
        <h3 className="text-xl font-semibold text-white">Aucun rapport disponible</h3>
        <p className="text-slate-400 mt-3">
          Les rapports liés à vos corrections apparaîtront ici une fois que l'Admin ou l'Auditeur en aura généré.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {rapports.map((rapport) => (
        <div
          key={rapport.id}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
        >
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-purple-400" />
              <div>
                <h3 className="font-semibold text-white">{rapport.titre}</h3>
                {rapport.concerneVulnerabilite && (
                  <p className="text-sm text-slate-400">{rapport.concerneVulnerabilite}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Calendar className="h-4 w-4" />
              {new Date(rapport.genereLe).toLocaleDateString('fr-FR')}
            </div>

            <div className="flex gap-3">
              <Link
                href={`/rapports/${rapport.id}`}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm transition"
              >
                <Eye className="h-4 w-4" />
                Voir
              </Link>

              <button
                onClick={() => toast("Téléchargement en cours...")}
                className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 rounded-xl text-sm text-white transition"
              >
                <Download className="h-4 w-4" />
                Télécharger
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}