// src/app/(dashboard)/inventaire/page.tsx
"use client";

import { useState } from "react";
import { DataTable } from "@/components/common/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Download, 
  Filter, 
  Search,
  ShieldAlert 
} from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge"; // On le créera après si besoin

const vulnerabilities = [
  {
    id: "VUL-3921",
    asset: "srv-web-prod-01.ministere.bj",
    name: "SQL Injection via login form (CVE-2025-1243)",
    severity: "Critique",
    cvss: 9.8,
    date: "2026-05-20",
    status: "Open",
    type: "Web Application"
  },
  {
    id: "VUL-3918",
    asset: "api-v2.ministere.bj",
    name: "Reflected XSS in search parameter",
    severity: "Haute",
    cvss: 8.5,
    date: "2026-05-19",
    status: "In Progress",
    type: "API"
  },
  {
    id: "VUL-3897",
    asset: "mail-server-02",
    name: "Weak Password Policy on Admin Account",
    severity: "Moyenne",
    cvss: 6.2,
    date: "2026-05-18",
    status: "Open",
    type: "Infrastructure"
  },
  {
    id: "VUL-3884",
    asset: "db-prod-01",
    name: "Outdated OpenSSL Version (Heartbleed risk)",
    severity: "Haute",
    cvss: 7.8,
    date: "2026-05-17",
    status: "Resolved",
    type: "Serveur"
  },
  {
    id: "VUL-3879",
    asset: "portal.ministere.bj",
    name: "Missing Rate Limiting on Authentication",
    severity: "Moyenne",
    cvss: 5.9,
    date: "2026-05-16",
    status: "Open",
    type: "Web Application"
  },
];

export default function InventairePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState("Tous");
  const [statusFilter, setStatusFilter] = useState("Tous");

  const filteredData = vulnerabilities.filter(item => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.asset.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSeverity = severityFilter === "Tous" || item.severity === severityFilter;
    const matchesStatus = statusFilter === "Tous" || item.status === statusFilter;

    return matchesSearch && matchesSeverity && matchesStatus;
  });

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
    { header: "Type", accessor: "type" as const },
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
    { 
      header: "Actions", 
      accessor: () => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline">Détails</Button>
          <Button size="sm" variant="default">Remédier</Button>
        </div>
      )
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Inventaire des Vulnérabilités</h1>
          <p className="text-gray-400 mt-1">Gestion et suivi de toutes les vulnérabilités détectées</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Exporter CSV
          </Button>
          <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4" />
            Nouvelle Analyse
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-4 bg-gray-950 border border-gray-800 p-5 rounded-3xl">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder="Rechercher par asset ou vulnérabilité..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-11 bg-gray-900 border-gray-700"
          />
        </div>

        <select 
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3"
        >
          <option value="Tous">Toutes Criticités</option>
          <option value="Critique">Critique</option>
          <option value="Haute">Haute</option>
          <option value="Moyenne">Moyenne</option>
        </select>

        <select 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3"
        >
          <option value="Tous">Tous Statuts</option>
          <option value="Open">Open</option>
          <option value="In Progress">In Progress</option>
          <option value="Resolved">Resolved</option>
        </select>

        <Button variant="outline" className="gap-2">
          <Filter className="w-4 h-4" />
          Plus de filtres
        </Button>
      </div>

      {/* Tableau */}
      <div className="bg-gray-950 border border-gray-800 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
          <h3 className="text-xl font-semibold">
            Toutes les Vulnérabilités ({filteredData.length})
          </h3>
          <span className="text-sm text-gray-500">Trié par date de découverte</span>
        </div>
        
        <DataTable columns={columns} data={filteredData} />
      </div>
    </div>
  );
}