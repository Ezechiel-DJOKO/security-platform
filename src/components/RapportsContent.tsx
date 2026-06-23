'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  Calendar,
  FileText,
  FileSpreadsheet,
  FileJson,
  Award,
  Clock,
  Download,
  TrendingUp
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

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

const COLORS = ['#3b82f6', '#22c55e', '#ef4444', '#a855f7'];

export default function RapportsContent() {
  const [periode, setPeriode] = useState<'mois' | 'trimestre' | 'annee'>('mois');
  const [isExporting, setIsExporting] = useState(false);
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="text-slate-400 mt-4">Chargement des rapports...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-20">
        <p className="text-amber-500 text-lg">Vous devez être connecté pour accéder aux rapports.</p>
      </div>
    );
  }

  const exportReport = async (format: 'pdf' | 'xlsx' | 'json') => {
    setIsExporting(true);
    try {
      const res = await fetch(`/api/reports/export?format=${format}&periode=${periode}`);
      if (!res.ok) throw new Error('Erreur serveur');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport-securite-${new Date().toISOString().slice(0,10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Toast de succès
      // toast.success(`Rapport ${format.toUpperCase()} téléchargé`);
    } catch (err) {
      alert(`Erreur lors de l'export ${format.toUpperCase()}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Rapports & Analyses</h1>
          <p className="text-slate-400 mt-2 text-lg">
            Suivi complet de la sécurité et performance de correction
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => exportReport('json')}
            disabled={isExporting}
            className="flex items-center gap-3 bg-slate-800 hover:bg-slate-700 px-6 py-3.5 rounded-2xl text-white transition-all active:scale-95 disabled:opacity-60"
          >
            <FileJson className="w-5 h-5" />
            <span>JSON</span>
          </button>

          <button
            onClick={() => exportReport('xlsx')}
            disabled={isExporting}
            className="flex items-center gap-3 bg-emerald-600 hover:bg-emerald-700 px-6 py-3.5 rounded-2xl text-white transition-all active:scale-95 disabled:opacity-60"
          >
            <FileSpreadsheet className="w-5 h-5" />
            <span>Excel</span>
          </button>

          <button
            onClick={() => exportReport('pdf')}
            disabled={isExporting}
            className="flex items-center gap-3 bg-red-600 hover:bg-red-700 px-6 py-3.5 rounded-2xl text-white transition-all active:scale-95 disabled:opacity-60"
          >
            <FileText className="w-5 h-5" />
            <span>PDF</span>
          </button>

          <button
            onClick={() => {/* TODO: Comparatif */}}
            className="flex items-center gap-3 bg-violet-600 hover:bg-violet-700 px-6 py-3.5 rounded-2xl text-white transition-all active:scale-95"
          >
            <Award className="w-5 h-5" />
            <span>Comparatif</span>
          </button>
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Line Chart */}
        <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-3xl p-8 shadow-xl">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-2xl font-semibold text-white">Évolution Mensuelle</h3>
              <p className="text-slate-400">Incidents détectés vs Taux de résolution</p>
            </div>
            <div className="flex gap-2">
              {(['mois', 'trimestre', 'annee'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriode(p)}
                  className={`px-4 py-2 text-sm rounded-xl transition ${
                    periode === p 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={420}>
            <LineChart data={statsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="mois" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#0f172a', 
                  border: 'none', 
                  borderRadius: '12px',
                  color: '#fff'
                }} 
              />
              <Line 
                type="monotone" 
                dataKey="incidents" 
                stroke="#ef4444" 
                strokeWidth={4} 
                dot={{ r: 6 }}
                name="Incidents détectés" 
              />
              <Line 
                type="monotone" 
                dataKey="resolution" 
                stroke="#22c55e" 
                strokeWidth={4} 
                dot={{ r: 6 }}
                name="Taux de résolution (%)" 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="lg:col-span-4 bg-slate-950 border border-slate-800 rounded-3xl p-8 shadow-xl">
          <h3 className="text-2xl font-semibold text-white mb-8">Répartition des Rapports</h3>
          <ResponsiveContainer width="100%" height={380}>
            <PieChart>
              <Pie
                data={typeRapportData}
                cx="50%"
                cy="50%"
                innerRadius={85}
                outerRadius={130}
                dataKey="value"
                paddingAngle={5}
              >
                {typeRapportData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Section Plans de Correction */}
      <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-700 rounded-3xl p-12 text-center">
        <div className="max-w-2xl mx-auto">
          <Clock className="w-20 h-20 mx-auto text-slate-500 mb-6" />
          <h3 className="text-3xl font-semibold text-white mb-4">
            Rapports des Plans de Correction
          </h3>
          <p className="text-slate-400 text-lg leading-relaxed">
            Cette section sera bientôt enrichie avec des rapports détaillés sur 
            l'efficacité des corrections, le temps moyen de résolution par technicien, 
            et le taux de récidive des vulnérabilités.
          </p>
          <div className="mt-8 inline-flex items-center gap-2 bg-slate-800 px-5 py-3 rounded-2xl text-sm text-slate-400">
            <TrendingUp className="w-5 h-5" />
            Fonctionnalité en cours de développement
          </div>
        </div>
      </div>
    </div>
  );
}