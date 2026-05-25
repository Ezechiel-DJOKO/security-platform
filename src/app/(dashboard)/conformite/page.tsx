'use client';

import { ShieldCheck, AlertCircle, Clock, CheckCircle } from 'lucide-react';

const standards = [
  { 
    name: "ISO 27001", 
    score: 92, 
    status: "Excellent", 
    color: "emerald",
    controls: 45 
  },
  { 
    name: "RGPD / Protection des Données", 
    score: 87, 
    status: "Bon", 
    color: "blue",
    controls: 32 
  },
  { 
    name: "NIST Cybersecurity Framework", 
    score: 76, 
    status: "À améliorer", 
    color: "yellow",
    controls: 28 
  },
  { 
    name: "PCI DSS", 
    score: 65, 
    status: "Critique", 
    color: "red",
    controls: 18 
  },
];

const controlesRecents = [
  { id: "CTRL-001", norme: "ISO 27001", controle: "Gestion des accès", statut: "Conforme", date: "Aujourd'hui" },
  { id: "CTRL-002", norme: "RGPD", controle: "Consentement des données", statut: "En cours", date: "Hier" },
  { id: "CTRL-003", norme: "NIST", controle: "Détection des intrusions", statut: "Non conforme", date: "Il y a 3 jours" },
  { id: "CTRL-004", norme: "ISO 27001", controle: "Sauvegarde des données", statut: "Conforme", date: "Il y a 1 semaine" },
];

export default function ConformitePage() {
  const globalScore = 85;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Conformité</h1>
        <p className="text-slate-400 mt-2">Suivi de la conformité réglementaire et normative</p>
      </div>

      {/* Score Global */}
      <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-700 rounded-3xl p-8 flex flex-col items-center">
        <div className="text-emerald-400 text-7xl font-bold mb-2">{globalScore}%</div>
        <p className="text-2xl font-semibold text-white mb-1">Niveau de Conformité Global</p>
        <p className="text-slate-400">Dernière évaluation : il y a 2 jours</p>
      </div>

      {/* Standards Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {standards.map((standard, index) => (
          <div key={index} className="bg-slate-950 border border-slate-800 rounded-3xl p-6 hover:border-slate-700 transition-all">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-semibold text-lg">{standard.name}</h3>
                <p className="text-sm text-slate-500 mt-1">{standard.controls} contrôles</p>
              </div>
              <ShieldCheck className={`w-8 h-8 text-${standard.color}-500`} />
            </div>

            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span>Score</span>
                <span className="font-bold">{standard.score}%</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full bg-${standard.color}-500 rounded-full transition-all`}
                  style={{ width: `${standard.score}%` }}
                />
              </div>
            </div>

            <div className={`inline-block px-4 py-1 text-xs font-medium rounded-full border border-${standard.color}-500/30 bg-${standard.color}-500/10 text-${standard.color}-400`}>
              {standard.status}
            </div>
          </div>
        ))}
      </div>

      {/* Liste des Contrôles Récents */}
      <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold">Derniers Contrôles Évalués</h3>
          <button className="text-blue-500 hover:text-blue-400 text-sm font-medium flex items-center gap-2">
            Voir tous les contrôles →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-sm">
                <th className="px-6 py-4 text-left">ID</th>
                <th className="px-6 py-4 text-left">Norme</th>
                <th className="px-6 py-4 text-left">Contrôle</th>
                <th className="px-6 py-4 text-left">Statut</th>
                <th className="px-6 py-4 text-left">Date</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {controlesRecents.map((controle, i) => (
                <tr key={i} className="hover:bg-slate-900/50">
                  <td className="px-6 py-5 font-mono text-slate-400">{controle.id}</td>
                  <td className="px-6 py-5">{controle.norme}</td>
                  <td className="px-6 py-5 text-white">{controle.controle}</td>
                  <td className="px-6 py-5">
                    <span className={`px-4 py-1.5 text-xs font-medium rounded-full ${
                      controle.statut === 'Conforme' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                      controle.statut === 'En cours' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30' :
                      'bg-red-500/10 text-red-400 border border-red-500/30'
                    }`}>
                      {controle.statut}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-slate-400">{controle.date}</td>
                  <td className="px-6 py-5 text-center">
                    <button className="text-blue-400 hover:text-blue-500">
                      <ShieldCheck className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Prochaines Actions */}
      <div className="bg-slate-950 border border-amber-500/20 rounded-3xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <AlertCircle className="w-6 h-6 text-amber-500" />
          <h3 className="text-xl font-semibold">Actions Prioritaires</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-900/50 border border-amber-500/30 rounded-2xl p-5">
            <p className="font-medium">Mettre à jour la politique de sauvegarde</p>
            <p className="text-sm text-slate-400 mt-1">ISO 27001 - A.12.3</p>
            <p className="text-xs text-amber-500 mt-3">Échéance : 7 jours</p>
          </div>
          <div className="bg-slate-900/50 border border-amber-500/30 rounded-2xl p-5">
            <p className="font-medium">Former le personnel sur la protection des données</p>
            <p className="text-sm text-slate-400 mt-1">RGPD - Article 39</p>
            <p className="text-xs text-amber-500 mt-3">Échéance : 15 jours</p>
          </div>
        </div>
      </div>
    </div>
  );
}