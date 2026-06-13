'use client';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  Download,
  Calendar,
  FileText,
  TrendingUp,
  FileSpreadsheet,
  FileJson,
  Award
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// Données statiques
const rapportsRecents = [
  { id: "RPT-202605", titre: "Rapport Mensuel de Sécurité - Mai 2026", type: "Synthèse", date: "24 Mai 2026", taille: "2.4 MB" },
  { id: "RPT-202604", titre: "Audit des Vulnérabilités Q2 2026", type: "Technique", date: "15 Mai 2026", taille: "4.1 MB" },
  { id: "RPT-202603", titre: "Conformité ISO 27001 - Rapport Trimestriel", type: "Conformité", date: "02 Mai 2026", taille: "1.8 MB" },
];

const statsData = [
  { mois: 'Jan', incidents: 14, resolution: 85 },
  { mois: 'Fév', incidents: 22, resolution: 78 },
  { mois: 'Mar', incidents: 11, resolution: 92 },
  { mois: 'Avr', incidents: 18, resolution: 81 },
  { mois: 'Mai', incidents: 9, resolution: 95 },
];

const typeRapportData = [
  { name: 'Sécurité', value: 45, color: '#3b82f6' },
  { name: 'Conformité', value: 30, color: '#22c55e' },
  { name: 'Vulnérabilités', value: 25, color: '#ef4444' },
];

export default function RapportsContent() {
  const [periode, setPeriode] = useState('mois');
  const [isExporting, setIsExporting] = useState(false);
  const sessionContext = useSession();

  if (!sessionContext || sessionContext.status === "loading") {
    return <div className="flex items-center justify-center h-96 text-slate-400">Chargement des rapports...</div>;
  }

  const { data: session } = sessionContext;
  if (!session) {
    return <div className="text-center py-12 text-amber-500">Vous devez être connecté pour accéder aux rapports.</div>;
  }

  // Fonctions d'export
  const exportJSON = async () => {
    setIsExporting(true);
    try {
      const res = await fetch(`/api/reports/export?format=json&periode=${periode}`);
      if (!res.ok) throw new Error('Erreur serveur');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport-securite-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Erreur lors de l'export JSON");
    } finally {
      setIsExporting(false);
    }
  };

  const exportExcel = async () => {
    setIsExporting(true);
    try {
      const res = await fetch(`/api/reports/export?format=xlsx&periode=${periode}`);
      if (!res.ok) throw new Error('Erreur serveur');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport-securite-${new Date().toISOString().slice(0,10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Erreur lors de l'export Excel");
    } finally {
      setIsExporting(false);
    }
  };

  const exportPDF = async () => {
    setIsExporting(true);
    try {
      const res = await fetch(`/api/reports/export?format=pdf&periode=${periode}`);
      if (!res.ok) throw new Error('Erreur serveur');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport-securite-${new Date().toISOString().slice(0,10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Erreur lors de l'export PDF");
    } finally {
      setIsExporting(false);
    }
  };

  const generateComparativeReport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch('/api/reports/comparatif');
      if (!res.ok) throw new Error('Erreur serveur');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comparatif-outils-audit-${new Date().toISOString().slice(0,10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Erreur lors de la génération du comparatif");
    } finally {
      setIsExporting(false);
    }
  };

  const downloadRecentReport = (id: string, titre: string) => {
    alert(`📥 Téléchargement du rapport :\n${titre}\n\n(ID: ${id})\n\nFonctionnalité en cours de développement.`);
  };

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Rapports & Analyses</h1>
          <p className="text-slate-400 mt-1">Génération intelligente de rapports de sécurité</p>
        </div>

        {/* Boutons d'export */}
        <div className="flex gap-3 flex-wrap">
          <button onClick={exportJSON} disabled={isExporting} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-5 py-3 rounded-2xl text-white disabled:opacity-50">
            <FileJson className="w-5 h-5" /> JSON
          </button>
          <button onClick={exportExcel} disabled={isExporting} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 px-5 py-3 rounded-2xl text-white disabled:opacity-50">
            <FileSpreadsheet className="w-5 h-5" /> Excel
          </button>
          <button onClick={exportPDF} disabled={isExporting} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-5 py-3 rounded-2xl text-white disabled:opacity-50">
            <FileText className="w-5 h-5" /> PDF
          </button>
          <button onClick={generateComparativeReport} disabled={isExporting} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 px-5 py-3 rounded-2xl text-white disabled:opacity-50">
            <Award className="w-5 h-5" /> Comparatif Outils
          </button>
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-3xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-white">Évolution des Incidents et Taux de Résolution</h3>
            <Calendar className="w-5 h-5 text-slate-500" />
          </div>
          <ResponsiveContainer width="100%" height={380}>
            <LineChart data={statsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="mois" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff' }} />
              <Line type="monotone" dataKey="incidents" stroke="#ef4444" strokeWidth={4} name="Incidents" />
              <Line type="monotone" dataKey="resolution" stroke="#22c55e" strokeWidth={4} name="Résolution (%)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-4 bg-slate-950 border border-slate-800 rounded-3xl p-6">
          <h3 className="text-xl font-semibold text-white mb-6">Répartition par Type</h3>
          <ResponsiveContainer width="100%" height={380}>
            <PieChart>
              <Pie data={typeRapportData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} dataKey="value">
                {typeRapportData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Rapports Récents */}
      <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6">
        <h3 className="text-xl font-semibold text-white mb-6">Rapports Récents</h3>
        <div className="space-y-4">
          {rapportsRecents.map((rapport) => (
            <div key={rapport.id} className="flex items-center justify-between bg-slate-900 hover:bg-slate-800 rounded-2xl p-5 transition-all group">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium text-white group-hover:text-blue-400">{rapport.titre}</p>
                  <p className="text-sm text-slate-400">{rapport.type} • {rapport.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <span className="text-sm text-slate-500">{rapport.taille}</span>
                <button 
                  onClick={() => downloadRecentReport(rapport.id, rapport.titre)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-6 py-2.5 rounded-xl text-white transition-all"
                >
                  <Download className="w-4 h-4" />
                  Télécharger
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}