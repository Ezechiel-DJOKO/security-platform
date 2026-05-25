'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Download, Calendar, FileText, TrendingUp, Users, Shield } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

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
  { mois: 'Mai', incidents: 9,  resolution: 95 },
];

const typeRapportData = [
  { name: 'Sécurité', value: 45, color: '#3b82f6' },
  { name: 'Conformité', value: 30, color: '#22c55e' },
  { name: 'Vulnérabilités', value: 25, color: '#ef4444' },
];

export default function RapportsContent() {
  const [periode, setPeriode] = useState('mois');
  const sessionContext = useSession();

  // Intercepte et bloque l'exécution prématurée lors du processus de build
  if (!sessionContext || sessionContext.status === "loading") {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-slate-400">Chargement du module d'analyse...</p>
      </div>
    );
  }

  const { data: session } = sessionContext;

  if (!session) {
    return (
      <div className="text-center py-12 text-amber-500">
        Vous devez être connecté pour accéder aux rapports de sécurité.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Rapports</h1>
          <p className="text-slate-400 mt-2">Génération et consultation des rapports de sécurité</p>
        </div>
        <button className="flex items-center gap-3 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-2xl font-medium transition-all text-white">
          <FileText className="w-5 h-5" />
          Générer un nouveau rapport
        </button>
      </div>

      {/* Filtres */}
      <div className="flex gap-4">
        <div className="flex border border-slate-800 rounded-2xl p-1 bg-slate-950">
          {['semaine', 'mois', 'trimestre', 'annee'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriode(p)}
              className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${
                periode === p 
                  ? 'bg-slate-800 text-white' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Graphique Évolution */}
        <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-3xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-white">Évolution des Incidents et Taux de Résolution</h3>
            <Calendar className="w-5 h-5 text-slate-500" />
          </div>
          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={statsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="mois" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '12px', color: '#fff' }} />
                <Line type="monotone" dataKey="incidents" stroke="#ef4444" strokeWidth={3} name="Incidents" />
                <Line type="monotone" dataKey="resolution" stroke="#22c55e" strokeWidth={3} name="Taux de Résolution (%)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Répartition par Type */}
        <div className="lg:col-span-4 bg-slate-950 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between">
          <h3 className="text-xl font-semibold text-white mb-4">Répartition des Rapports</h3>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={typeRapportData} cx="50%" cy="50%" innerRadius={65} outerRadius={95} dataKey="value">
                  {typeRapportData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '12px', color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            {typeRapportData.map((item) => (
              <div key={item.name} className="flex items-center gap-2 text-sm text-slate-300">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                <span>{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rapports Récents */}
      <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6">
        <h3 className="text-xl font-semibold text-white mb-6">Rapports Récents</h3>
        
        <div className="space-y-4">
          {rapportsRecents.map((rapport, index) => (
            <div key={index} className="flex items-center justify-between bg-slate-900 hover:bg-slate-800/80 rounded-2xl p-5 transition-all group">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium text-white group-hover:text-blue-400 transition-colors">{rapport.titre}</p>
                  <p className="text-sm text-slate-400">{rapport.type} • {rapport.date}</p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <span className="text-sm text-slate-500">{rapport.taille}</span>
                <button className="flex items-center gap-2 bg-slate-800 hover:bg-blue-600 px-5 py-2.5 rounded-xl transition-all text-white">
                  <Download className="w-4 h-4" />
                  <span className="text-sm font-medium">Télécharger</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Boutons d'actions rapides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button className="bg-slate-950 border border-slate-800 hover:border-blue-600 p-8 rounded-3xl text-left transition-all group">
          <TrendingUp className="w-10 h-10 text-blue-500 mb-4" />
          <h4 className="text-xl font-semibold mb-2 text-white">Rapport d'Incidents</h4>
          <p className="text-slate-400 text-sm">Générer un rapport détaillé des incidents de sécurité</p>
        </button>

        <button className="bg-slate-950 border border-slate-800 hover:border-emerald-600 p-8 rounded-3xl text-left transition-all group">
          <Users className="w-10 h-10 text-emerald-500 mb-4" />
          <h4 className="text-xl font-semibold mb-2 text-white">Rapport Utilisateurs</h4>
          <p className="text-slate-400 text-sm">Activités et accès des utilisateurs</p>
        </button>

        <button className="bg-slate-950 border border-slate-800 hover:border-purple-600 p-8 rounded-3xl text-left transition-all group">
          <Shield className="w-10 h-10 text-purple-500 mb-4" />
          <h4 className="text-xl font-semibold mb-2 text-white">Rapport de Conformité</h4>
          <p className="text-slate-400 text-sm">État détaillé par norme</p>
        </button>
      </div>
    </div>
  );
}
