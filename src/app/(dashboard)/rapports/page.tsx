// src/app/(dashboard)/rapports/page.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/common/DataTable";
import { 
  Plus, 
  Download, 
  FileText, 
  Calendar,
  Eye 
} from "lucide-react";

const reports = [
  {
    id: "RPT-20260524-001",
    name: "Rapport Complet de Vulnérabilités - Mai 2026",
    type: "Vulnérabilités",
    date: "2026-05-24",
    status: "Terminé",
    format: "PDF",
    size: "8.4 MB"
  },
  {
    id: "RPT-20260522-003",
    name: "Audit de Conformité NIS2 & ISO 27001",
    type: "Conformité",
    date: "2026-05-22",
    status: "Terminé",
    format: "PDF",
    size: "12.7 MB"
  },
  {
    id: "RPT-20260520-002",
    name: "Rapport d'Activité - Semaine 20",
    type: "Audit Complet",
    date: "2026-05-20",
    status: "Terminé",
    format: "PDF",
    size: "5.2 MB"
  },
  {
    id: "RPT-20260518-001",
    name: "Analyse des Risques Critiques",
    type: "Vulnérabilités",
    date: "2026-05-18",
    status: "En cours",
    format: "JSON",
    size: "-"
  },
];

export default function RapportsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("Tous");

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === "Tous" || report.type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  const columns = [
    { header: "ID Rapport", accessor: "id" as const },
    { header: "Nom du Rapport", accessor: "name" as const },
    { 
      header: "Type", 
      accessor: (r: any) => (
        <span className="inline-block px-4 py-1 rounded-full bg-gray-800 text-xs font-medium">
          {r.type}
        </span>
      )
    },
    { header: "Date de Génération", accessor: "date" as const },
    { 
      header: "Statut", 
      accessor: (r: any) => (
        <span className={`px-4 py-1 rounded-full text-sm font-medium
          ${r.status === "Terminé" ? "bg-green-500/20 text-green-400" : 
            "bg-blue-500/20 text-blue-400"}`}>
          {r.status}
        </span>
      )
    },
    { header: "Format", accessor: "format" as const },
    { header: "Taille", accessor: "size" as const },
    { 
      header: "Actions", 
      accessor: (r: any) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-1">
            <Eye className="w-4 h-4" />
            Voir
          </Button>
          {r.status === "Terminé" && (
            <Button size="sm" variant="default" className="gap-1">
              <Download className="w-4 h-4" />
              Télécharger
            </Button>
          )}
        </div>
      )
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Rapports</h1>
          <p className="text-gray-400 mt-1">Génération et consultation des rapports de sécurité</p>
        </div>
        <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-lg px-6 py-6">
          <Plus className="w-5 h-5" />
          Générer un Nouveau Rapport
        </Button>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-4 bg-gray-950 border border-gray-800 p-6 rounded-3xl">
        <div className="relative flex-1 min-w-[320px]">
          <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder="Rechercher un rapport..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-11 bg-gray-900 border-gray-700"
          />
        </div>

        <select 
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-2xl px-5 py-3 min-w-[200px]"
        >
          <option value="Tous">Tous les Types</option>
          <option value="Vulnérabilités">Vulnérabilités</option>
          <option value="Conformité">Conformité</option>
          <option value="Audit Complet">Audit Complet</option>
        </select>

        <Button variant="outline" className="gap-2">
          <Calendar className="w-4 h-4" />
          Période
        </Button>
      </div>

      {/* Liste des Rapports */}
      <div className="bg-gray-950 border border-gray-800 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-gray-800">
          <h3 className="text-xl font-semibold">
            Rapports Générés ({filteredReports.length})
          </h3>
        </div>
        
        <DataTable columns={columns} data={filteredReports} />
      </div>

      {/* Zone de Génération Rapide */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-950 border border-gray-800 rounded-3xl p-6 hover:border-blue-600 transition-colors cursor-pointer">
          <h4 className="font-semibold text-lg">Rapport Vulnérabilités</h4>
          <p className="text-gray-400 text-sm mt-2">Synthèse complète des vulnérabilités actuelles</p>
          <Button className="w-full mt-6">Générer</Button>
        </div>

        <div className="bg-gray-950 border border-gray-800 rounded-3xl p-6 hover:border-blue-600 transition-colors cursor-pointer">
          <h4 className="font-semibold text-lg">Rapport Conformité</h4>
          <p className="text-gray-400 text-sm mt-2">État détaillé par norme (ISO, NIS2...)</p>
          <Button className="w-full mt-6">Générer</Button>
        </div>

        <div className="bg-gray-950 border border-gray-800 rounded-3xl p-6 hover:border-blue-600 transition-colors cursor-pointer">
          <h4 className="font-semibold text-lg">Audit Complet</h4>
          <p className="text-gray-400 text-sm mt-2">Rapport global de sécurité</p>
          <Button className="w-full mt-6">Générer</Button>
        </div>
      </div>
    </div>
  );
}