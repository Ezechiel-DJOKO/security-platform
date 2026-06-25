// src/components/rapports/RapportsAdmin.tsx  (je te recommande de renommer)
'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Calendar, FileText, FileSpreadsheet, FileJson, Award, 
  Clock, Download, TrendingUp, RefreshCw 
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { toast } from 'react-hot-toast';

export default function RapportsAdmin() {
  const { data: session, status } = useSession();
  const [periode, setPeriode] = useState<'mois' | 'trimestre' | 'annee'>('mois');
  const [isExporting, setIsExporting] = useState(false);
  const [kpis, setKpis] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Données dynamiques pour les graphiques
  const [statsData, setStatsData] = useState<any[]>([]);
  const [typeRapportData, setTypeRapportData] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/kpis');
        const json = await res.json();

        if (json.success) {
          setKpis(json.data);

          // Simulation de données mensuelles basée sur les KPIs (à remplacer par vraie API plus tard)
          const dynamicStats = [
            { mois: 'Jan', incidents: 18, resolution: 72 },
            { mois: 'Fév', incidents: 24, resolution: 79 },
            { mois: 'Mar', incidents: 15, resolution: 88 },
            { mois: 'Avr', incidents: 21, resolution: 82 },
            { mois: 'Mai', incidents: 12, resolution: 94 },
          ];
          setStatsData(dynamicStats);

          // Répartition dynamique
          setTypeRapportData([
            { name: 'Vulnérabilités', value: json.data.totalVulnerabilites || 45, color: '#ef4444' },
            { name: 'Conformité', value: json.data.scoreISO27001 || 30, color: '#22c55e' },
            { name: 'Scans', value: 25, color: '#3b82f6' },
          ]);
        }
      } catch (error) {
        console.error(error);
        toast.error("Impossible de charger les données");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const exportReport = async (format: 'pdf' | 'xlsx' | 'json') => {
    setIsExporting(true);
    try {
      const res = await fetch(`/api/reports/export?format=${format}&periode=${periode}`);
      
      if (!res.ok) throw new Error('Échec de l\'export');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport-securite-${new Date().toISOString().slice(0,10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Rapport ${format.toUpperCase()} téléchargé avec succès !`);
    } catch (err) {
      toast.error(`Erreur lors de l'export ${format.toUpperCase()}`);
    } finally {
      setIsExporting(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="text-slate-400 mt-4">Chargement des analyses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Rapports & Analyses</h1>
          <p className="text-slate-400 mt-2 text-lg">
            Suivi complet de la sécurité et performance de correction
          </p>
        </div>

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
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Line Chart - Évolution */}
        <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-3xl p-8">
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
                  className={`px-5 py-2 text-sm rounded-xl transition font-medium ${
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
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }} />
              <Line type="monotone" dataKey="incidents" stroke="#ef4444" strokeWidth={4} dot={{ r: 6 }} name="Incidents" />
              <Line type="monotone" dataKey="resolution" stroke="#22c55e" strokeWidth={4} dot={{ r: 6 }} name="Résolution (%)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="lg:col-span-4 bg-slate-950 border border-slate-800 rounded-3xl p-8">
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
          <Clock className="w-20 h-20 mx-auto text-amber-400 mb-6" />
          <h3 className="text-3xl font-semibold text-white mb-4">
            Rapports des Plans de Correction
          </h3>
          <p className="text-slate-400 text-lg leading-relaxed">
            Efficacité des corrections, temps moyen de résolution par technicien, 
            taux de récidive et performance des équipes.
          </p>
          <button className="mt-8 px-8 py-3 bg-amber-600 hover:bg-amber-500 rounded-2xl text-white font-medium transition">
            Générer un rapport Plans de Correction
          </button>
        </div>
      </div>
    </div>
  );
}