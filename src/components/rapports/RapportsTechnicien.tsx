// src/components/rapports/RapportsTechnicien.tsx
'use client';
import { useState, useEffect } from 'react';
import { FileText, Download, Eye, Calendar, AlertCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

type Rapport = {
  id: string;
  titre: string;
  genereLe: string;
  format?: string;
  type?: string;
  concerneVulnerabilite?: string;
  statut?: 'termine' | 'en_cours' | 'brouillon';
};

export default function RapportsTechnicien() {
  const [rapports, setRapports] = useState<Rapport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRapports = async (showToast = false) => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/reports/export?mesRapports=true');

      if (!res.ok) throw new Error('Erreur lors du chargement');

      const result = await res.json();
      const data = Array.isArray(result) 
        ? result 
        : result.data || result.reports || [];

      setRapports(data);
      if (showToast) toast.success(`${data.length} rapports chargés`);
    } catch (err) {
      console.error(err);
      setError("Impossible de charger vos rapports");
      toast.error("Erreur de chargement");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRapports();
  }, []);

  const handleDownload = (id: string, titre: string) => {
    toast.success(`Téléchargement de "${titre}"...`);
    // À implémenter plus tard : window.open(`/api/reports/download/${id}`, '_blank');
  };

  if (loading) {
    return <div className="text-slate-400 py-12 text-center">Chargement de vos rapports...</div>;
  }

  if (error || rapports.length === 0) {
    return (
      <div className="bg-slate-950 border border-slate-800 rounded-3xl p-16 text-center">
        <AlertCircle className="h-16 w-16 mx-auto text-slate-400 mb-6" />
        <h3 className="text-xl font-semibold text-white">Aucun rapport disponible</h3>
        <p className="text-slate-400 mt-3 max-w-md mx-auto">
          Les rapports liés à vos corrections apparaîtront ici une fois générés par l'Admin ou l'Auditeur.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Mes Rapports</h2>
        <button
          onClick={() => fetchRapports(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      <div className="grid gap-4">
        {rapports.map((rapport) => (
          <div
            key={rapport.id}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-600 transition-all group"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400 mt-1">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-white group-hover:text-purple-400 transition-colors">
                    {rapport.titre}
                  </h3>
                  {rapport.concerneVulnerabilite && (
                    <p className="text-sm text-slate-400 mt-1">{rapport.concerneVulnerabilite}</p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                    <Calendar className="h-3.5 w-3.5" />
                    Généré le {new Date(rapport.genereLe).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Link
                  href={`/rapports/${rapport.id}`}
                  className="flex items-center gap-2 px-5 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm transition"
                >
                  <Eye className="h-4 w-4" />
                  Voir
                </Link>
                <button
                  onClick={() => handleDownload(rapport.id, rapport.titre)}
                  className="flex items-center gap-2 px-5 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl text-sm text-white transition"
                >
                  <Download className="h-4 w-4" />
                  Télécharger
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}