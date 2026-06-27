// src/components/dashboard/DashboardContent.tsx
'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  AlertTriangle, TrendingUp, RefreshCw, UserCheck,
  Clock, Shield, CheckCircle, Target, Users, Activity
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
  BarChart, Bar
} from 'recharts';

import KPICards from '@/components/dashboard/KPICards';
import MesTachesTechnicien from '@/components/dashboard/MesTachesTechnicien';
import CorrectionsAValider from '@/components/dashboard/CorrectionsAValider';

// ─── Types ────────────────────────────────────────────────────

type KPIData = {
  totalVulnerabilites: number;
  vulnsCritiques: number;
  vulnsHautes: number;
  vulnsMoyennes: number;
  vulnsFaibles: number;
  vulnsCorrigees: number;
  vulnsOuvertes: number;
  vulnsEnCours: number;
  tauxCorrection: number;
  scoreISO27001: number;
  delaiMoyenCorrection: number;
  totalScans: number;
  totalActifs: number;
  plansTotal: number;
  plansEnRetard: number;
  plansTermines: number;
  lastUpdated: Date;
  cvssDistribution?: Array<{ name: string; value: number; color: string }>;
  temporalTrends?: Array<{ mois: string; vulns: number; scoreMoyen: number }>;
  evolutionMensuelle?: Array<{
    mois: string;
    incidents: number;
    resolution: number;
    scans: number;
  }>;
  repartitionSeverite?: Array<{ name: string; value: number; color: string }>;
  repartitionStatut?: Array<{ name: string; value: number; color: string }>;
  topActifs?: Array<{ nom: string; nbVulns: number; criticite: string }>;
  performanceTechniciens?: Array<{
    nom: string;
    plansTermines: number;
    delaiMoyen: number;
  }>;
};

// ─── Carte KPI rapide ────────────────────────────────────────

function KpiCard({
  icon, label, value, sub, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className={`rounded-2xl border p-5 bg-slate-950 ${color} hover:scale-[1.02] transition-transform`}>
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-xl bg-slate-800">{icon}</div>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-sm text-slate-400 mt-1">{label}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Composant principal ─────────────────────────────────────

export default function DashboardContent() {
  const { data: session, status } = useSession();
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const isMountedRef = useRef(true);

  const userRole = session?.user?.role as string | undefined;

  // ─── Fetch ───────────────────────────────────────────────

  const fetchKPIs = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      setError(null);
      setRefreshing(true);

      const res = await fetch('/api/kpis', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const result = await res.json();

      if (result.success && result.data) {
        if (isMountedRef.current) setKpis(result.data);
      } else {
        throw new Error(result.error || 'Erreur lors du chargement des KPIs');
      }
    } catch (err: any) {
      console.error(err);
      if (isMountedRef.current) {
        setError(err.message || 'Impossible de charger les données');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    if (session?.user) fetchKPIs();
    return () => { isMountedRef.current = false; };
  }, [session, fetchKPIs]);

  // ─── États de chargement / erreur ────────────────────────

  if (status === 'loading' || (loading && !kpis)) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-400">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
          <p>Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-12 text-amber-500">
        Vous devez être connecté pour accéder au tableau de bord.
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-950/50 border border-red-900 p-8 rounded-3xl text-red-400 text-center">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
        <p className="text-xl mb-4">{error}</p>
        <button
          onClick={fetchKPIs}
          className="px-6 py-2 bg-red-900 hover:bg-red-800 rounded-xl text-white transition-colors"
        >
          Réessayer
        </button>
      </div>
    );
  }

  // ─── Données sûres ───────────────────────────────────────

  const d: KPIData = kpis || {
    totalVulnerabilites: 0, vulnsCritiques: 0, vulnsHautes: 0,
    vulnsMoyennes: 0, vulnsFaibles: 0, vulnsCorrigees: 0,
    vulnsOuvertes: 0, vulnsEnCours: 0, tauxCorrection: 0,
    scoreISO27001: 0, delaiMoyenCorrection: 0, totalScans: 0,
    totalActifs: 0, plansTotal: 0, plansEnRetard: 0, plansTermines: 0,
    lastUpdated: new Date(),
    cvssDistribution: [], temporalTrends: [], evolutionMensuelle: [],
    repartitionSeverite: [], repartitionStatut: [],
    topActifs: [], performanceTechniciens: [],
  };

  const tooltipStyle = {
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '8px',
    color: '#f1f5f9',
  };

  // ─── Render ──────────────────────────────────────────────

  return (
    <div className="space-y-8 pb-8">

      {/* ══════════ HEADER ══════════ */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Tableau de Bord
            {userRole && (
              <span className="text-slate-400 text-2xl ml-2">- {userRole}</span>
            )}
          </h1>
          <p className="text-slate-400 mt-2">
            Vue d'ensemble de la sécurité •{' '}
            <span className="text-emerald-400 font-semibold ml-1">
              {session.user?.name || session.user?.email}
            </span>
          </p>
        </div>

        <button
          onClick={fetchKPIs}
          disabled={refreshing}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 
                     rounded-2xl text-slate-300 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {/* ══════════ KPIs LIGNE 1 (principaux) ══════════ */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <div className="col-span-2">
          <KpiCard
            icon={<AlertTriangle className="h-5 w-5 text-red-400" />}
            label="Vulnérabilités totales"
            value={d.totalVulnerabilites}
            sub={`${d.vulnsCritiques} critiques`}
            color="border-red-900"
          />
        </div>
        <div className="col-span-2">
          <KpiCard
            icon={<CheckCircle className="h-5 w-5 text-emerald-400" />}
            label="Taux de correction"
            value={`${d.tauxCorrection?.toFixed(1) ?? 0}%`}
            sub={`${d.vulnsCorrigees} corrigées`}
            color="border-emerald-900"
          />
        </div>
        <div className="col-span-2">
          <KpiCard
            icon={<Shield className="h-5 w-5 text-blue-400" />}
            label="Score ISO 27001"
            value={`${d.scoreISO27001}%`}
            sub="Conformité globale"
            color="border-blue-900"
          />
        </div>
        <div className="col-span-2">
          <KpiCard
            icon={<Clock className="h-5 w-5 text-amber-400" />}
            label="Délai moyen correction"
            value={`${d.delaiMoyenCorrection}j`}
            sub={`${d.plansEnRetard} plans en retard`}
            color="border-amber-900"
          />
        </div>
      </div>

      {/* ══════════ KPIs LIGNE 2 (secondaires) ══════════ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          icon={<Activity className="h-5 w-5 text-purple-400" />}
          label="Scans réalisés"
          value={d.totalScans}
          color="border-purple-900"
        />
        <KpiCard
          icon={<Target className="h-5 w-5 text-cyan-400" />}
          label="Actifs surveillés"
          value={d.totalActifs}
          color="border-cyan-900"
        />
        <KpiCard
          icon={<TrendingUp className="h-5 w-5 text-orange-400" />}
          label="Plans de correction"
          value={d.plansTotal}
          sub={`${d.plansTermines} terminés`}
          color="border-orange-900"
        />
        <KpiCard
          icon={<Users className="h-5 w-5 text-pink-400" />}
          label="En cours de traitement"
          value={d.vulnsEnCours}
          sub="vulnérabilités"
          color="border-pink-900"
        />
      </div>

      {/* ══════════ GRAPHIQUES LIGNE 1 ══════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Évolution mensuelle */}
        <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all">
          <h3 className="text-lg font-semibold text-white mb-1">Évolution Mensuelle</h3>
          <p className="text-slate-400 text-sm mb-6">
            Incidents détectés vs Taux de résolution
          </p>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={d.evolutionMensuelle || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="mois" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Line type="monotone" dataKey="incidents" stroke="#ef4444"
                    strokeWidth={3} dot={{ r: 5 }} name="Incidents" />
              <Line type="monotone" dataKey="resolution" stroke="#22c55e"
                    strokeWidth={3} dot={{ r: 5 }} name="Résolution (%)" />
              <Line type="monotone" dataKey="scans" stroke="#3b82f6"
                    strokeWidth={3} dot={{ r: 5 }} name="Scans" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Répartition sévérité */}
        <div className="lg:col-span-4 bg-slate-950 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all">
          <h3 className="text-lg font-semibold text-white mb-1">Répartition par Sévérité</h3>
          <p className="text-slate-400 text-sm mb-6">Distribution des vulnérabilités</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={d.repartitionSeverite || []}
                cx="50%" cy="50%"
                innerRadius={65} outerRadius={100}
                dataKey="value" paddingAngle={4}
              >
                {(d.repartitionSeverite || []).map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {(d.repartitionSeverite || []).map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full shrink-0"
                     style={{ backgroundColor: item.color }} />
                <span className="text-xs text-slate-400">
                  {item.name} ({item.value})
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════ GRAPHIQUES LIGNE 2 ══════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Top actifs vulnérables */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all">
          <h3 className="text-lg font-semibold text-white mb-1">Actifs les plus vulnérables</h3>
          <p className="text-slate-400 text-sm mb-6">Nombre de vulnérabilités par actif</p>
          {(d.topActifs || []).length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-500">
              Aucune donnée disponible
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={d.topActifs} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" stroke="#64748b" fontSize={12} />
                <YAxis type="category" dataKey="nom" stroke="#64748b" fontSize={11} width={100} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="nbVulns" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Vulnérabilités" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Performance techniciens */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all">
          <h3 className="text-lg font-semibold text-white mb-1">Performance des Techniciens</h3>
          <p className="text-slate-400 text-sm mb-6">Plans terminés et délai moyen</p>
          {(d.performanceTechniciens || []).length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-500">
              Aucun technicien avec des plans terminés
            </div>
          ) : (
            <div className="space-y-3">
              {(d.performanceTechniciens || []).map((tech, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                      {tech.nom.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-200">{tech.nom}</p>
                      <p className="text-xs text-slate-500">{tech.plansTermines} plan(s) terminé(s)</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-emerald-400">{tech.delaiMoyen}j</p>
                    <p className="text-xs text-slate-500">délai moy.</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ══════════ PLANS DE CORRECTION ══════════ */}
      {(d.repartitionStatut || []).length > 0 && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all">
          <h3 className="text-lg font-semibold text-white mb-4">Statut des Plans de Correction</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {d.repartitionStatut!.map((item, i) => (
              <div key={i} className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-3xl font-black mb-1" style={{ color: item.color }}>
                  {item.value}
                </div>
                <p className="text-xs text-slate-400 text-center">{item.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════ CONTENU PAR RÔLE ══════════ */}
      <div className="mt-8 space-y-8">
        {userRole === 'TECHNICIEN' && <MesTachesTechnicien />}

        {userRole === 'SUPERVISEUR' && <CorrectionsAValider />}

        {userRole === 'AUDITEUR' && (
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-orange-400" />
              Activité Récente
            </h2>
            <div className="text-center py-8 text-slate-500 border border-dashed border-slate-700 rounded-2xl">
              Section Auditeur en cours de développement
            </div>
          </div>
        )}

        {userRole === 'ADMIN' && (
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <UserCheck className="h-6 w-6 text-purple-400" />
              Administration Globale
            </h2>
            <p className="text-slate-400">
              Gestion des utilisateurs, statistiques avancées et configuration système.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}