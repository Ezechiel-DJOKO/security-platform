'use client';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { LayoutDashboard, Bug, CheckSquare, FileText, ShieldCheck, Users, Clock } from 'lucide-react';
import KPICards from './KPICards';

interface KPIData {
  totalVulnerabilites: number;
  vulnsCritiques: number;
  vulnsCorrigees: number;
  pourcentageCritiquesResolus: number;
  delaiMoyenCorrection: number;
  scoreISO27001: number;
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
        {/* Vulnérabilités à Suivre */}
        <div className="xl:col-span-7 bg-slate-950 border border-slate-800 rounded-3xl p-8">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
            <Bug className="text-red-400" /> Vulnérabilités Critiques à Suivre
          </h2>
          <div className="text-center py-20 text-slate-400 border border-dashed border-slate-700 rounded-2xl">
            Carte des vulnérabilités critiques (à implémenter)
          </div>
        </div>

        {/* Plans de Correction */}
        <div className="xl:col-span-5 bg-slate-950 border border-slate-800 rounded-3xl p-8">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
            <CheckSquare className="text-amber-400" /> Plans de Correction
          </h2>
          <div className="text-center py-16 text-slate-400 border border-dashed border-slate-700 rounded-2xl">
            Plans en retard / En cours (à implémenter)
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-3xl p-8">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
            <ShieldCheck className="text-emerald-400" /> Conformité Globale
          </h2>
          <div className="text-center py-20 text-slate-400 border border-dashed border-slate-700 rounded-2xl">
            Graphique de conformité ISO 27001 (à implémenter)
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-8">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
            <Users className="text-blue-400" /> Performance des Équipes
          </h2>
          <div className="text-center py-12 text-slate-400">
            Statut des techniciens et taux de résolution
          </div>
        </div>
      </div>
    </div>
  );
}