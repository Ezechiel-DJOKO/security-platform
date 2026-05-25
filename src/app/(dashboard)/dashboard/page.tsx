'use client';

import { Shield, AlertTriangle, CheckCircle, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// Données exemples
const kpiData = [
  { title: "Actifs Total", value: "248", change: "+12", icon: Shield, color: "text-blue-500" },
  { title: "Vulnérabilités Critiques", value: "17", change: "-3", icon: AlertTriangle, color: "text-red-500" },
  { title: "Taux de Conformité", value: "94%", change: "+2%", icon: CheckCircle, color: "text-emerald-500" },
  { title: "Scans Actifs", value: "8", change: "+1", icon: Activity, color: "text-purple-500" },
];

const evolutionData = [
  { mois: 'Jan', incidents: 12, scans: 45 },
  { mois: 'Fév', incidents: 19, scans: 52 },
  { mois: 'Mar', incidents: 8,  scans: 61 },
  { mois: 'Avr', incidents: 15, scans: 48 },
  { mois: 'Mai', incidents: 10, scans: 67 },
];

const conformiteData = [
  { name: 'Conforme', value: 94, color: '#22c55e' },
  { name: 'Non Conforme', value: 6, color: '#ef4444' },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Tableau de Bord</h1>
        <p className="text-slate-400 mt-2">Vue d’ensemble de la sécurité • Mise à jour il y a 2 minutes</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiData.map((kpi, index) => (
          <div key={index} className="bg-slate-950 border border-slate-800 rounded-3xl p-6 hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-400">{kpi.title}</h3>
              <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
            </div>
            <div className="text-4xl font-bold text-white mb-1">{kpi.value}</div>
            <p className={`text-sm flex items-center gap-1 ${kpi.change.startsWith('+') ? 'text-emerald-500' : 'text-red-500'}`}>
              {kpi.change} ce mois
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        {/* Graphique Évolution */}
        <div className="lg:col-span-4 bg-slate-950 border border-slate-800 rounded-3xl p-6">
          <h3 className="text-lg font-semibold mb-6">Évolution des Incidents & Scans</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={evolutionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="mois" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip />
              <Bar dataKey="incidents" fill="#ef4444" name="Incidents" radius={6} />
              <Bar dataKey="scans" fill="#3b82f6" name="Scans" radius={6} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Taux de Conformité */}
        <div className="lg:col-span-3 bg-slate-950 border border-slate-800 rounded-3xl p-6 flex flex-col items-center">
          <h3 className="text-lg font-semibold mb-6">Répartition de Conformité</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={conformiteData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={110}
                dataKey="value"
              >
                {conformiteData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 text-center">
            <p className="text-5xl font-bold text-emerald-500">94%</p>
            <p className="text-slate-400 mt-1">Globalement Conforme</p>
          </div>
        </div>
      </div>

      {/* Dernières Activités */}
      <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6">
        <h3 className="text-lg font-semibold mb-6">Dernières Activités (Audit Trail)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-slate-400">
                <th className="pb-4">Utilisateur</th>
                <th className="pb-4">Action</th>
                <th className="pb-4">Entité</th>
                <th className="pb-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {[
                { user: "Jean Dupont", action: "Scan initié", entite: "Serveur Prod", date: "Il y a 12 min" },
                { user: "Marie Koto", action: "Actif modifié", entite: "PC-ADMIN-045", date: "Il y a 47 min" },
                { user: "Admin Système", action: "Accès refusé", entite: "Base de données", date: "Il y a 2h" },
              ].map((log, i) => (
                <tr key={i} className="hover:bg-slate-900/50">
                  <td className="py-4 font-medium">{log.user}</td>
                  <td className="py-4">{log.action}</td>
                  <td className="py-4 text-slate-400">{log.entite}</td>
                  <td className="py-4 text-slate-500">{log.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}