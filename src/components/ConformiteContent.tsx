'use client';

import { ShieldCheck } from 'lucide-react';
import { useSession } from 'next-auth/react';

const standards = [
  { 
    name: "ISO 27001", score: 92, status: "Excellent", controls: 45,
    styles: { text: "text-emerald-500", bg: "bg-emerald-500", badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" }
  },
  { 
    name: "RGPD / Protection des Données", score: 87, status: "Bon", controls: 32,
    styles: { text: "text-blue-500", bg: "bg-blue-500", badge: "border-blue-500/30 bg-blue-500/10 text-blue-400" }
  },
  { 
    name: "NIST Cybersecurity Framework", score: 76, status: "À améliorer", controls: 28,
    styles: { text: "text-yellow-500", bg: "bg-yellow-500", badge: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400" }
  },
  { 
    name: "PCI DSS", score: 65, status: "Critique", controls: 18,
    styles: { text: "text-red-500", bg: "bg-red-500", badge: "border-red-500/30 bg-red-500/10 text-red-400" }
  },
];

export default function ConformiteContent() {
  const sessionContext = useSession();

  // Si le build tente d'évaluer le composant ou si c'est en cours de chargement
  if (!sessionContext || sessionContext.status === "loading") {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-slate-400">Chargement des données de conformité...</p>
      </div>
    );
  }

  const { data: session } = sessionContext;

  if (!session) {
    return (
      <div className="text-center py-12 text-amber-500">
        Vous devez être connecté pour voir les informations de conformité.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Conformité</h1>
        <p className="text-slate-400 mt-2">Suivi de la conformité réglementaire et normative</p>
      </div>

      <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-700 rounded-3xl p-8 flex flex-col items-center">
        <div className="text-emerald-400 text-7xl font-bold mb-2">85%</div>
        <p className="text-2xl font-semibold text-white mb-1">Niveau de Conformité Global</p>
        <p className="text-slate-400">Dernière évaluation : il y a 2 jours</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {standards.map((standard, index) => (
          <div key={index} className="bg-slate-950 border border-slate-800 rounded-3xl p-6 hover:border-slate-700 transition-all">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-semibold text-lg text-white">{standard.name}</h3>
                <p className="text-sm text-slate-500 mt-1">{standard.controls} contrôles</p>
              </div>
              <ShieldCheck className={`w-8 h-8 ${standard.styles.text}`} />
            </div>

            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2 text-slate-400">
                <span>Score</span>
                <span className="font-bold text-white">{standard.score}%</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full ${standard.styles.bg} rounded-full`} style={{ width: `${standard.score}%` }} />
              </div>
            </div>

            <div className={`inline-block px-4 py-1 text-xs font-medium rounded-full border ${standard.styles.badge}`}>
              {standard.status}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
