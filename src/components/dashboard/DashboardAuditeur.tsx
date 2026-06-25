'use client';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { LayoutDashboard, ScanLine, Bug, ShieldCheck, FileText } from 'lucide-react';

import KPICards from './KPICards';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface KPIData {
  totalVulnerabilites: number;
  vulnsCritiques: number;
  vulnsCorrigees: number;
  pourcentageCritiquesResolus: number;
  delaiMoyenCorrection: number;
  scoreISO27001: number;
  lastUpdated: string;
  lastScan: string | null;
  cvssDistribution: any[];
  temporalTrends: any[];
  role: string;
}

export default function DashboardAuditeur() {
  const { data: session } = useSession();
  
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchKPIs = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const res = await fetch('/api/kpis');

        if (!res.ok) {
          throw new Error(`Erreur HTTP: ${res.status}`);
        }

        const json = await res.json();

        if (json.success) {
          setKpis(json.data);
        } else {
          throw new Error(json.error || 'Erreur lors du chargement des données');
        }
      } catch (err: any) {
        console.error('Erreur KPIs:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchKPIs();
  }, []);

  if (error) {
    return (
      <div className="p-8 text-red-400 bg-red-950/30 border border-red-900 rounded-3xl">
        Erreur : {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-blue-500/10 rounded-2xl">
            <LayoutDashboard className="h-9 w-9 text-blue-400" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white">Tableau de Bord Auditeur</h1>
            <p className="text-slate-400 mt-1">
              Bienvenue, {session?.user?.name || 'Auditeur'} • Suivi global de la sécurité
            </p>
          </div>
        </div>
        <div className="text-sm text-slate-400">
          Dernière mise à jour : {kpis?.lastUpdated ? new Date(kpis.lastUpdated).toLocaleString('fr-FR') : 'Chargement...'}
        </div>
      </div>

      {/* KPIs Globaux */}
      <KPICards isLoading={isLoading} kpis={kpis} />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Derniers Scans */}
        <Card className="xl:col-span-7 bg-slate-950 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <ScanLine className="text-sky-400" />
              Derniers Scans Effectués
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-64 flex items-center justify-center text-slate-400">
                Chargement des scans...
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 border border-dashed border-slate-700 rounded-2xl">
                Dernier scan : {kpis?.lastScan 
                  ? new Date(kpis.lastScan).toLocaleDateString('fr-FR') 
                  : 'Aucun scan trouvé'}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vulnérabilités Critiques */}
        <Card className="xl:col-span-5 bg-slate-950 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Bug className="text-red-400" />
              Vulnérabilités Critiques
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="text-6xl font-bold text-red-400 mb-3">
              {kpis?.vulnsCritiques ?? 0}
            </div>
            <p className="text-slate-400">vulnérabilités critiques actives</p>
            
            <p className="text-emerald-400 mt-6 font-medium">
              {kpis?.pourcentageCritiquesResolus ?? 0}% résolues ces 2 derniers mois
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Conformité & Rapports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-950 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <ShieldCheck className="text-emerald-400" />
              Niveau de Conformité
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center py-10">
            <div className="text-7xl font-bold text-emerald-400">
              {kpis?.scoreISO27001 ?? 0}%
            </div>
            <p className="text-slate-400 mt-2">Score ISO 27001</p>
            <a href="/conformite" className="mt-6 inline-block text-blue-400 hover:underline">
              Voir détails de conformité →
            </a>
          </CardContent>
        </Card>

        <Card className="bg-slate-950 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <FileText className="text-purple-400" />
              Rapports d’Audit
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center py-10">
            <div className="text-slate-400">Prochainement disponible</div>
            <a href="/rapports" className="mt-6 block text-blue-400 hover:underline">
              Accéder à tous les rapports →
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}