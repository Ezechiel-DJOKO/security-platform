'use client';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { LayoutDashboard, Bug, CheckSquare, ShieldCheck, Users } from 'lucide-react';
import KPICards from './KPICards';

// Interface complète basée sur ton API /api/kpis
interface KPIData {
  totalVulnerabilites: number;
  vulnsCritiques: number;
  vulnsHautes: number;
  vulnsMoyennes: number;
  vulnsFaibles: number;
  vulnsCorrigees: number;
  vulnsOuvertes: number;
  vulnsEnCours: number;
  pourcentageCritiquesResolus: number;
  delaiMoyenCorrection: number;
  scoreISO27001: number;
  plansTotal: number;
  plansEnRetard: number;
  plansEnCours: number;
  plansTermines: number;
  tauxCorrection: number;
  performanceTechniciens?: Array<{
    nom: string;
    plansTotal: number;
    plansTermines: number;
    delaiMoyen: number;
  }>;
  topActifs?: Array<{
    nom: string;
    nbVulns: number;
    critiques: number;
  }>;
  lastUpdated: string;
  lastScan: string | null;
}

export default function DashboardSuperviseur() {
  const { data: session } = useSession();
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchKPIs = async () => {
      try {
        const res = await fetch('/api/kpis');
        const json = await res.json();
        if (json.success) {
          setKpis(json.data);
        }
      } catch (error) {
        console.error("Erreur chargement KPIs:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchKPIs();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="p-4 bg-violet-500/10 rounded-2xl">
          <LayoutDashboard className="h-9 w-9 text-violet-400" />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-white">Tableau de Bord Superviseur</h1>
          <p className="text-slate-400 mt-1">
            Bienvenue, {session?.user?.name} • Supervision & Pilotage
          </p>
        </div>
      </div>

      <KPICards isLoading={isLoading} kpis={kpis} />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Vulnérabilités Critiques à Suivre */}
        <div className="xl:col-span-7 bg-slate-950 border border-slate-800 rounded-3xl p-8">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
            <Bug className="text-red-400" /> Vulnérabilités Critiques à Suivre
          </h2>
          
          {isLoading ? (
            <div className="h-64 flex items-center justify-center text-slate-400">Chargement des données...</div>
          ) : kpis ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="bg-slate-900 border border-red-900/30 rounded-2xl p-6">
                <p className="text-red-400 text-sm">Critiques</p>
                <p className="text-5xl font-bold mt-3 text-white">{kpis.vulnsCritiques}</p>
              </div>
              <div className="bg-slate-900 border border-amber-900/30 rounded-2xl p-6">
                <p className="text-amber-400 text-sm">Ouvertes</p>
                <p className="text-5xl font-bold mt-3 text-amber-400">{kpis.vulnsOuvertes}</p>
              </div>
              <div className="bg-slate-900 border border-emerald-900/30 rounded-2xl p-6">
                <p className="text-emerald-400 text-sm">Taux Correction</p>
                <p className="text-5xl font-bold mt-3 text-emerald-400">{kpis.tauxCorrection}%</p>
              </div>
              <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6">
                <p className="text-slate-400 text-sm">Délai Moyen</p>
                <p className="text-5xl font-bold mt-3">{kpis.delaiMoyenCorrection}j</p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Plans de Correction */}
        <div className="xl:col-span-5 bg-slate-950 border border-slate-800 rounded-3xl p-8">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
            <CheckSquare className="text-amber-400" /> Plans de Correction
          </h2>
          
          {isLoading ? (
            <div className="h-64 flex items-center justify-center text-slate-400">Chargement...</div>
          ) : kpis ? (
            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <div className="text-6xl font-bold text-red-400">{kpis.plansEnRetard}</div>
                  <div className="text-sm text-slate-400 mt-1">EN RETARD</div>
                </div>
                <div>
                  <div className="text-6xl font-bold text-amber-400">{kpis.plansEnCours}</div>
                  <div className="text-sm text-slate-400 mt-1">EN COURS</div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-800">
                <div className="flex justify-between text-sm mb-3">
                  <span>Progression globale des plans</span>
                  <span className="font-semibold">
                    {kpis.plansTermines} / {kpis.plansTotal}
                  </span>
                </div>
                <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ 
                      width: kpis.plansTotal > 0 
                        ? `${Math.round((kpis.plansTermines / kpis.plansTotal) * 100)}%` 
                        : '0%' 
                    }}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conformité Globale */}
        <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-3xl p-8">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
            <ShieldCheck className="text-emerald-400" /> Conformité Globale
          </h2>
          {isLoading ? (
            <div className="h-80 flex items-center justify-center text-slate-400">Chargement du score...</div>
          ) : kpis ? (
            <div className="flex justify-center py-16">
              <div className="relative w-64 h-64">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
                  <circle cx="100" cy="100" r="85" fill="none" stroke="#334155" strokeWidth="22" />
                  <circle 
                    cx="100" cy="100" r="85" 
                    fill="none" 
                    stroke="#10b981" 
                    strokeWidth="22"
                    strokeDasharray={`${kpis.scoreISO27001} 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-7xl font-bold text-emerald-400">{kpis.scoreISO27001}</div>
                  <div className="text-slate-400 text-xl -mt-2">/ 100</div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Performance des Équipes */}
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-8">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
            <Users className="text-blue-400" /> Performance des Équipes
          </h2>
          
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-14 bg-slate-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : kpis?.performanceTechniciens && kpis.performanceTechniciens.length > 0 ? (
            <div className="space-y-5">
              {kpis.performanceTechniciens.slice(0, 5).map((tech, i) => (
                <div key={i} className="flex justify-between items-center py-1">
                  <div>
                    <div className="font-medium text-white">{tech.nom}</div>
                    <div className="text-xs text-slate-500">
                      {tech.plansTermines}/{tech.plansTotal} plans • {tech.delaiMoyen}j
                    </div>
                  </div>
                  <div className="text-emerald-400 font-bold text-lg">
                    {Math.round((tech.plansTermines / tech.plansTotal) * 100)}%
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-slate-400 py-20 text-center">
              Aucune donnée de performance disponible pour le moment
            </div>
          )}
        </div>
      </div>
    </div>
  );
}