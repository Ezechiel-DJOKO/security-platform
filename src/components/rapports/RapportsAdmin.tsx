// src/components/rapports/RapportsAdmin.tsx
'use client';
import { useState } from 'react';
import { FileText, FileSpreadsheet, FileJson, Download } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function RapportsAdmin() {
  const [periode, setPeriode] = useState<'mois' | 'trimestre' | 'annee'>('mois');
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const exportReport = async (format: 'pdf' | 'xlsx' | 'json') => {
    setIsExporting(format);
    try {
      const res = await fetch(`/api/reports/export?format=${format}&periode=${periode}`);
      if (!res.ok) throw new Error('Échec export');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport-securite-${new Date().toISOString().slice(0, 10)}.${format === 'xlsx' ? 'xlsx' : format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Rapport ${format.toUpperCase()} téléchargé !`);
    } catch (err: any) {
      toast.error(`Erreur : ${err.message}`);
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white">Exporter un Rapport</h2>
        <p className="text-slate-400 text-sm">
          Générez un rapport de sécurité pour la période sélectionnée.
        </p>
      </div>

      {/* Sélection période */}
      <div className="flex gap-1 bg-slate-800 rounded-xl p-1 w-fit">
        {(['mois', 'trimestre', 'annee'] as const).map(p => (
          <button
            key={p}
            onClick={() => setPeriode(p)}
            className={`px-5 py-2 text-sm rounded-lg transition font-medium ${
              periode === p ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {p === 'mois' ? 'Mois' : p === 'trimestre' ? 'Trimestre' : 'Année'}
          </button>
        ))}
      </div>

      {/* Cartes d'export */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { fmt: 'pdf' as const, label: 'PDF', desc: 'Rapport complet avec graphiques', color: 'bg-red-600 hover:bg-red-700', icon: FileText },
          { fmt: 'xlsx' as const, label: 'Excel', desc: 'Données tabulaires exploitables', color: 'bg-emerald-600 hover:bg-emerald-700', icon: FileSpreadsheet },
          { fmt: 'json' as const, label: 'JSON', desc: 'Données brutes pour intégration', color: 'bg-slate-600 hover:bg-slate-700', icon: FileJson },
        ].map(({ fmt, label, desc, color, icon: Icon }) => (
          <button
            key={fmt}
            onClick={() => exportReport(fmt)}
            disabled={!!isExporting}
            className={`${color} rounded-2xl p-6 text-left text-white 
                       transition disabled:opacity-50 active:scale-[0.98]`}
          >
            <Icon className="w-8 h-8 mb-3 opacity-80" />
            <h3 className="text-lg font-bold">{label}</h3>
            <p className="text-sm opacity-75 mt-1">{desc}</p>
            <div className="flex items-center gap-2 mt-4 text-sm font-medium">
              <Download className="w-4 h-4" />
              {isExporting === fmt ? 'Génération...' : 'Télécharger'}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}