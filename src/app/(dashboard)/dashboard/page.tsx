// src/app/(dashboard)/dashboard/page.tsx
"use client";

import { useState, useEffect } from "react";
import { KPICard } from "@/components/dashboard/KPICard";
import { DataTable } from "@/components/common/DataTable";
import { KPICardSkeleton } from "@/components/dashboard/KPICardSkeleton";
import { DataTableSkeleton } from "@/components/common/DataTableSkeleton";
import { Skeleton } from "@/components/common/Skeleton";

import { 
  ShieldAlert, 
  TrendingUp, 
  CheckCircle, 
  Server,
  Plus,
  Download 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

const kpiData = [
  { title: "Vulnérabilités Critiques", value: "14", subtitle: "Action immédiate", icon: ShieldAlert, trend: -23, color: "red" as const },
  { title: "Score de Risque Global", value: "67", subtitle: "/100 - Modéré", icon: TrendingUp, trend: -8, color: "yellow" as const },
  { title: "Assets Scannés", value: "248", subtitle: "79.5% du parc", icon: Server, trend: 14, color: "blue" as const },
  { title: "Taux de Conformité", value: "84%", subtitle: "Objectif 95%", icon: CheckCircle, trend: 5, color: "green" as const },
];

const vulnerabilityTrend = [
  { day: "5 Mai", critical: 28, high: 45, total: 73 },
  { day: "8 Mai", critical: 24, high: 41, total: 65 },
  { day: "11 Mai", critical: 31, high: 38, total: 69 },
  { day: "14 Mai", critical: 19, high: 52, total: 71 },
  { day: "17 Mai", critical: 22, high: 47, total: 69 },
  { day: "20 Mai", critical: 18, high: 39, total: 57 },
  { day: "23 Mai", critical: 14, high: 35, total: 49 },
];

const topVulnerabilities = [
  { id: "VUL-3921", asset: "srv-web-prod-01.ministere.bj", name: "SQL Injection (CVE-2025-1243)", severity: "Critique", cvss: 9.8, date: "2026-05-20", status: "Open" },
  { id: "VUL-3918", asset: "api-v2.ministere.bj", name: "Cross-Site Scripting (XSS)", severity: "Haute", cvss: 8.5, date: "2026-05-19", status: "In Progress" },
  { id: "VUL-3897", asset: "mail-server-02", name: "Weak Admin Password", severity: "Moyenne", cvss: 6.2, date: "2026-05-18", status: "Open" },
];

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);

  // Simulation de chargement (tu pourras le remplacer par un vrai fetch plus tard)
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1800); // 1.8 secondes de chargement

    return () => clearTimeout(timer);
  }, []);

  const columns = [
    { header: "ID", accessor: "id" as const },
    { header: "Asset", accessor: "asset" as const },
    { header: "Vulnérabilité", accessor: "name" as const },
    { 
      header: "Criticité", 
      accessor: (v: any) => (
        <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-semibold
          ${v.severity === "Critique" ? "bg-red-500/20 text-red-400 border border-red-500/30" : 
            v.severity === "Haute" ? "bg-orange-500/20 text-orange-400 border border-orange-500/30" : 
            "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"}`}>
          {v.severity}
        </span>
      )
    },
    { header: "CVSS", accessor: (v: any) => <span className="font-mono font-medium">{v.cvss}</span> },
    { header: "Date", accessor: "date" as const },
    { 
      header: "Statut", 
      accessor: (v: any) => (
        <span className={`px-4 py-1 rounded-full text-sm font-medium
          ${v.status === "Open" ? "bg-red-500/20 text-red-400" : 
            v.status === "In Progress" ? "bg-blue-500/20 text-blue-400" : 
            "bg-green-500/20 text-green-400"}`}>
          {v.status}
        </span>
      )
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-start">
          <div>
            <Skeleton className="h-10 w-80" />
            <Skeleton className="h-5 w-96 mt-2" />
          </div>
        </div>

        {/* KPI Skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <KPICardSkeleton key={i} />
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <Skeleton className="h-8 w-80 mb-6" />
            <div className="h-80 bg-gray-950 border border-gray-800 rounded-3xl animate-pulse" />
          </div>
          <div>
            <Skeleton className="h-8 w-64 mb-6" />
            <DataTableSkeleton rows={4} columns={5} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Dashboard Sécurité</h1>
          <p className="text-gray-400 mt-1">Dernière mise à jour : Aujourd’hui à 09:31 • Ministère du Numérique</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Exporter
          </Button>
          <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4" />
            Nouvelle Analyse
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiData.map((kpi, index) => (
          <KPICard key={index} {...kpi} />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Graphique Interactif */}
        <div className="xl:col-span-2 bg-gray-950 border border-gray-800 rounded-3xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold">Évolution des Vulnérabilités (30 derniers jours)</h3>
            <div className="text-sm text-gray-400">Critiques vs Hautes</div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={vulnerabilityTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="day" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: "8px" }} />
                <Area type="natural" dataKey="total" stroke="#3b82f6" fill="#1e40af" fillOpacity={0.3} />
                <Line type="natural" dataKey="critical" stroke="#ef4444" strokeWidth={3} dot={{ fill: "#ef4444", r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Vulnérabilités */}
        <div className="bg-gray-950 border border-gray-800 rounded-3xl p-6">
          <h3 className="text-xl font-semibold mb-6">Top Vulnérabilités Critiques</h3>
          <DataTable columns={columns} data={topVulnerabilities} />
          <Button variant="ghost" className="w-full mt-4 text-blue-400 hover:text-blue-300">
            Voir toutes les vulnérabilités →
          </Button>
        </div>
      </div>
    </div>
  );
}