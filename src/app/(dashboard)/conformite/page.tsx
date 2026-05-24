// src/app/(dashboard)/conformite/page.tsx
"use client";

import { DataTable } from "@/components/common/DataTable";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  Download, 
  Calendar 
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from "recharts";

const frameworks = [
  { name: "ISO 27001", compliance: 92, status: "Compliant", color: "#22c55e" },
  { name: "NIS2", compliance: 78, status: "In Progress", color: "#eab308" },
  { name: "RGPD", compliance: 95, status: "Compliant", color: "#22c55e" },
  { name: "PCI-DSS", compliance: 65, status: "Partial", color: "#f97316" },
];

const globalCompliance = [
  { name: "Conforme", value: 84, color: "#22c55e" },
  { name: "Non Conforme", value: 16, color: "#ef4444" },
];

const controls = [
  {
    id: "CTRL-001",
    requirement: "Gestion des accès et des identifiants",
    framework: "ISO 27001 + RGPD",
    status: "Compliant",
    lastAudit: "2026-04-15",
    nextAudit: "2026-10-15",
    owner: "Tanguy ADJOVI"
  },
  {
    id: "CTRL-002",
    requirement: "Chiffrement des données sensibles",
    framework: "RGPD + NIS2",
    status: "Compliant",
    lastAudit: "2026-03-20",
    nextAudit: "2026-09-20",
    owner: "Jean-Paul HOUNTON"
  },
  {
    id: "CTRL-003",
    requirement: "Journalisation et monitoring des événements",
    framework: "NIS2",
    status: "Partial",
    lastAudit: "2026-05-01",
    nextAudit: "2026-08-01",
    owner: "Marie SODJINOU"
  },
  {
    id: "CTRL-004",
    requirement: "Tests d'intrusion réguliers",
    framework: "PCI-DSS",
    status: "In Progress",
    lastAudit: "2026-05-10",
    nextAudit: "2026-07-10",
    owner: "Tanguy ADJOVI"
  },
];

export default function ConformitePage() {
  const columns = [
    { header: "ID", accessor: "id" as const },
    { header: "Exigence / Contrôle", accessor: "requirement" as const },
    { header: "Framework", accessor: "framework" as const },
    { 
      header: "Statut", 
      accessor: (c: any) => (
        <span className={`px-4 py-1.5 rounded-full text-sm font-medium
          ${c.status === "Compliant" ? "bg-green-500/20 text-green-400" : 
            c.status === "Partial" ? "bg-orange-500/20 text-orange-400" : 
            "bg-blue-500/20 text-blue-400"}`}>
          {c.status}
        </span>
      )
    },
    { header: "Dernier Audit", accessor: "lastAudit" as const },
    { header: "Prochain Audit", accessor: "nextAudit" as const },
    { header: "Responsable", accessor: "owner" as const },
    { 
      header: "Actions", 
      accessor: () => <Button size="sm" variant="outline">Modifier</Button>
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Conformité</h1>
          <p className="text-gray-400 mt-1">Suivi de la conformité aux normes et réglementations</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Exporter Rapport
          </Button>
          <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4" />
            Ajouter Contrôle
          </Button>
        </div>
      </div>

      {/* Global Compliance + Frameworks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Taux de Conformité Global */}
        <div className="lg:col-span-1 bg-gray-950 border border-gray-800 rounded-3xl p-8 flex flex-col items-center">
          <h3 className="text-2xl font-semibold mb-6">Conformité Globale</h3>
          <div className="w-52 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={globalCompliance}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  dataKey="value"
                >
                  {globalCompliance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center mt-6">
            <p className="text-5xl font-bold text-green-400">84%</p>
            <p className="text-gray-400 mt-1">Global Compliance Rate</p>
          </div>
        </div>

        {/* Frameworks Cards */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          {frameworks.map((fw, index) => (
            <div key={index} className="bg-gray-950 border border-gray-800 rounded-3xl p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-xl font-semibold">{fw.name}</h4>
                  <p className="text-gray-400 text-sm mt-1">Dernier audit : {fw.name === "PCI-DSS" ? "Mai 2026" : "Avril 2026"}</p>
                </div>
                <span className={`px-4 py-2 rounded-2xl text-sm font-medium
                  ${fw.status === "Compliant" ? "bg-green-500/20 text-green-400" : 
                    fw.status === "In Progress" ? "bg-yellow-500/20 text-yellow-400" : "bg-orange-500/20 text-orange-400"}`}>
                  {fw.status}
                </span>
              </div>

              <div className="mt-8">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Taux de conformité</span>
                  <span className="font-semibold">{fw.compliance}%</span>
                </div>
                <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all"
                    style={{ 
                      width: `${fw.compliance}%`, 
                      backgroundColor: fw.color 
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tableau des Contrôles */}
      <div className="bg-gray-950 border border-gray-800 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
          <h3 className="text-xl font-semibold">Liste des Contrôles et Exigences</h3>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Calendar className="w-4 h-4" />
            Audits mis à jour le 24/05/2026
          </div>
        </div>
        
        <DataTable columns={columns} data={controls} />
      </div>
    </div>
  );
}