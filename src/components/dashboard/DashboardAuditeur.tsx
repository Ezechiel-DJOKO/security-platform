'use client';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { 
  LayoutDashboard, ScanLine, Bug, ShieldCheck, FileText,
  TrendingUp, AlertTriangle, CheckCircle, Clock, Activity,
  Users, Target, Download, RefreshCw
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { toast } from 'react-hot-toast';

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
  scanCount: number;
  activeAssets: number;
  cvssDistribution: Array<{ name: string; value: number; color: string }>;
  temporalTrends: Array<{ mois: string; vulns: number; scoreMoyen: number }>;
  recentVulnerabilities: Array<{
    id: string;
    titre: string;
    severite: string;
    dateDecouverte: string;
    statut: string;
  }>;
  role: string;
}

// Couleurs pour les graphiques
const SEVERITY_COLORS = {
  critique: '#ef4444',
  haute: '#f97316',
  moyenne: '#eab308',
  faible: '#22c55e'
};

export default function DashboardAuditeur() {
  const { data: session } = useSession();
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchKPIs = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setRefreshing(true);

      const res = await fetch('/api/kpis', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });

      if (!res.ok) {
        throw new Error(`Erreur HTTP: ${res.status}`);
      }

      const json = await res.json();

      if (json.success) {
        setKpis(json.data);
        toast.success('Données mises à jour');
      } else {
        throw new Error(json.error || 'Erreur lors du chargement des données');
      }
    } catch (err: any) {
      console.error('Erreur KPIs:', err);
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchKPIs();
  }, []);

  // État de chargement
  if (error) {
    return (
      <div className="p-8 text-red-400 bg-red-950/30 border border-red-900 rounded-3xl">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="h-8 w-8" />
          <h2 className="text-xl font-bold">Erreur de chargement</h2>
        </div>
        <p className="mb-6">{error}</p>
        <button 
          onClick={fetchKPIs}
          className="px-6 py-2 bg-red-900 hover:bg-red-800 rounded-xl text-white transition-colors"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* En-tête avec rafraîchissement */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl">
            <LayoutDashboard className="h-9 w-9 text-blue-400" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white">Tableau de Bord Auditeur</h1>
            <p className="text-slate-400 mt-1">
              Bienvenue, {session?.user?.name || 'Auditeur'} • Vue d'ensemble globale
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-sm text-slate-400">
            <Clock className="inline h-4 w-4 mr-1" />
            Mis à jour : {kpis?.lastUpdated 
              ? new Date(kpis.lastUpdated).toLocaleString('fr-FR')
              : '...'}
          </div>
          
          <button
            onClick={fetchKPIs}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 
                       rounded-xl text-slate-300 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>
      </div>

      {/* KPIs Globaux */}
      <KPICards isLoading={isLoading} kpis={kpis} />

      {/* Ligne 2 : Statistiques avancées */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-950 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-purple-400" />
              <div>
                <p className="text-2xl font-bold text-white">{kpis?.scanCount ?? 0}</p>
                <p className="text-xs text-slate-400">Scans réalisés</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-950 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-cyan-400" />
              <div>
                <p className="text-2xl font-bold text-white">{kpis?.activeAssets ?? 0}</p>
                <p className="text-xs text-slate-400">Actifs surveillés</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-950 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
              <div>
                <p className="text-2xl font-bold text-white">{kpis?.vulnsCorrigees ?? 0}</p>
                <p className="text-xs text-slate-400">Vulnérabilités corrigées</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-950 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-amber-400" />
              <div>
                <p className="text-2xl font-bold text-white">{kpis?.delaiMoyenCorrection ?? 0}j</p>
                <p className="text-xs text-slate-400">Délai moyen correction</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Évolution temporelle */}
        <Card className="lg:col-span-7 bg-slate-950 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <TrendingUp className="text-emerald-400" />
              Évolution des Vulnérabilités
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {(kpis?.temporalTrends && kpis.temporalTrends.length > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={kpis.temporalTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="mois" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: '1px solid #1e293b',
                        borderRadius: '8px',
                        color: '#f1f5f9'
                      }}
                    />
                    <Line 
                      type="monotone" dataKey="vulns" 
                      stroke="#ef4444" strokeWidth={3}
                      dot={{ r: 5, fill: '#ef4444' }}
                      name="Vulnérabilités"
                    />
                    <Line 
                      type="monotone" dataKey="scoreMoyen" 
                      stroke="#22c55e" strokeWidth={3}
                      dot={{ r: 5, fill: '#22c55e' }}
                      name="Score moyen CVSS"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500">
                  Aucune donnée d'évolution disponible
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Distribution CVSS */}
        <Card className="lg:col-span-5 bg-slate-950 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Bug className="text-red-400" />
              Distribution CVSS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {(kpis?.cvssDistribution && kpis.cvssDistribution.length > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={kpis.cvssDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      dataKey="value"
                      paddingAngle={3}
                    >
                      {kpis.cvssDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: '1px solid #1e293b',
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500">
                  Aucune donnée de distribution disponible
                </div>
              )}
            </div>

            {/* Légende */}
            {kpis?.cvssDistribution && kpis.cvssDistribution.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mt-4">
                {kpis.cvssDistribution.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-slate-400">
                      {item.name} ({item.value})
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Section Conformité & Activité */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score de Conformité */}
        <Card className="bg-slate-950 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <ShieldCheck className="text-emerald-400" />
              Niveau de Conformité ISO 27001
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center py-8">
            <div className="relative inline-flex items-center justify-center">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle 
                  cx="64" cy="64" r="56" 
                  fill="none" stroke="#1e293b" strokeWidth="8"
                />
                <circle 
                  cx="64" cy="64" r="56" 
                  fill="none" stroke="#22c55e" strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 56}`}
                  strokeDashoffset={`${2 * Math.PI * 56 * (1 - (kpis?.scoreISO27001 ?? 0) / 100)}`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <span className="absolute text-3xl font-bold text-emerald-400">
                {kpis?.scoreISO27001 ?? 0}%
              </span>
            </div>
            <p className="text-slate-400 mt-4">Score de conformité global</p>
            
            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Vulnérabilités résolues</span>
                <span className="text-emerald-400 font-medium">
                  {kpis?.pourcentageCritiquesResolus ?? 0}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Objectif minimum</span>
                <span className="text-amber-400 font-medium">70%</span>
              </div>
            </div>

            <a 
              href="/conformite" 
              className="mt-8 inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 
                         transition-colors text-sm"
            >
              Voir les détails de conformité →
            </a>
          </CardContent>
        </Card>

        {/* Dernières vulnérabilités */}
        <Card className="bg-slate-950 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <AlertTriangle className="text-amber-400" />
              Dernières Vulnérabilités Détectées
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(kpis?.recentVulnerabilities && kpis.recentVulnerabilities.length > 0) ? (
              <div className="space-y-3">
                {kpis.recentVulnerabilities.slice(0, 5).map((vuln, i) => (
                  <div key={vuln.id || i} className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="h-2.5 w-2.5 rounded-full mt-1"
                          style={{ 
                            backgroundColor: SEVERITY_COLORS[vuln.severite as keyof typeof SEVERITY_COLORS] 
                          }}
                        />
                        <div>
                          <p className="text-sm font-medium text-slate-200 truncate max-w-[200px]">
                            {vuln.titre}
                          </p>
                          <p className="text-xs text-slate-500">
                            {new Date(vuln.dateDecouverte).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        vuln.statut === 'ouvert' ? 'bg-red-900/50 text-red-400' :
                        vuln.statut === 'en_cours' ? 'bg-amber-900/50 text-amber-400' :
                        'bg-emerald-900/50 text-emerald-400'
                      }`}>
                        {vuln.statut}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-emerald-400" />
                <p>Aucune vulnérabilité récente détectée</p>
              </div>
            )}

            <a 
              href="/vulnerabilites" 
              className="mt-6 inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 
                         transition-colors text-sm"
            >
              Voir toutes les vulnérabilités →
            </a>
          </CardContent>
        </Card>
      </div>

      {/* Dernier scan & Rapports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-950 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <ScanLine className="text-sky-400" />
              Dernière Analyse
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center py-8">
            {kpis?.lastScan ? (
              <>
                <div className="text-2xl font-bold text-white mb-2">
                  {new Date(kpis.lastScan).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
                <p className="text-slate-400">Dernier scan de sécurité effectué</p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-amber-400 mb-2">
                  Aucun scan trouvé
                </div>
                <p className="text-slate-400">Lancez votre premier scan de sécurité</p>
              </>
            )}
            
            <a 
              href="/scans" 
              className="mt-8 inline-flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 
                         rounded-xl text-white transition-colors"
            >
              <ScanLine className="h-4 w-4" />
              Voir les scans
            </a>
          </CardContent>
        </Card>

        <Card className="bg-slate-950 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <FileText className="text-purple-400" />
              Rapports d'Audit
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center py-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Download className="h-6 w-6 text-purple-400" />
              <span className="text-2xl font-bold text-white">Générer</span>
            </div>
            <p className="text-slate-400 mb-6">
              Exportez vos rapports d'audit en PDF, Excel ou JSON
            </p>
            
            <div className="flex justify-center gap-3">
              <a 
                href="/rapports?format=pdf" 
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg 
                           text-white text-sm transition-colors"
              >
                PDF
              </a>
              <a 
                href="/rapports?format=xlsx" 
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 
                           rounded-lg text-white text-sm transition-colors"
              >
                Excel
              </a>
              <a 
                href="/rapports?format=json" 
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 
                           rounded-lg text-white text-sm transition-colors"
              >
                JSON
              </a>
            </div>

            <a 
              href="/rapports" 
              className="mt-8 inline-block text-blue-400 hover:text-blue-300 
                         transition-colors text-sm"
            >
              Accéder à tous les rapports →
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}