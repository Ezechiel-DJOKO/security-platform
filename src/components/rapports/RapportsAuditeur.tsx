// src/components/rapports/RapportsAuditeur.tsx
'use client';
import { useState, useEffect } from 'react';
import { 
  FileText, Download, Eye, Calendar, ShieldCheck, 
  ScanLine, Award, TrendingUp, AlertCircle 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type Rapport = {
  id: string;
  titre: string;
  genereLe: string;
  type: string;
  scoreConformite?: number;
  description?: string;
};

export default function RapportsAuditeur() {
  const [stats, setStats] = useState<any>(null);
  const [rapports, setRapports] = useState<Rapport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      setError(null);

      // KPIs
      const kpisRes = await fetch('/api/kpis');
      const kpisJson = await kpisRes.json();
      if (kpisJson.success) setStats(kpisJson.data);

      // Rapports d'audit - Correction importante
      const reportsRes = await fetch('/api/reports/export?type=audit');
      if (!reportsRes.ok) throw new Error('Erreur lors du chargement des rapports');

      const reportsJson = await reportsRes.json();
      const data = Array.isArray(reportsJson) 
        ? reportsJson 
        : reportsJson.data || reportsJson.reports || [];

      setRapports(data);
    } catch (err: any) {
      console.error("Erreur chargement rapports auditeur:", err);
      setError(err.message || "Impossible de charger les rapports");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDownload = (rapport: Rapport) => {
    window.open(`/api/reports/export?format=pdf&id=${rapport.id}`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-400">Chargement des rapports d'audit...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      

      {/* Cartes Synthèse */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-950 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <ShieldCheck className="text-emerald-400" />
              Conformité Globale
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center py-10">
            <div className="text-7xl font-bold text-emerald-400 mb-3">
              {stats?.scoreISO27001 ?? 0}%
            </div>
            <p className="text-slate-400 text-lg">Score ISO 27001</p>
            <a href="/conformite" className="text-blue-400 hover:underline mt-6 inline-block">
              Voir l'analyse complète →
            </a>
          </CardContent>
        </Card>

        <Card className="bg-slate-950 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <ScanLine className="text-sky-400" />
              Activité des Scans
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center py-10">
            <div className="text-6xl font-bold text-sky-400 mb-3">
              {stats?.totalVulnerabilites ?? 0}
            </div>
            <p className="text-slate-400">Vulnérabilités détectées</p>
          </CardContent>
        </Card>
      </div>

      {/* Liste des Rapports */}
      <Card className="bg-slate-950 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Award className="text-purple-400" />
            Mes Rapports d'Audit
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="py-12 text-center text-red-400">
              <AlertCircle className="mx-auto h-12 w-12 mb-4" />
              {error}
            </div>
          ) : rapports.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              Aucun rapport d'audit disponible pour le moment.
            </div>
          ) : (
            <div className="space-y-4">
              {rapports.map((rapport) => (
                <div
                  key={rapport.id}
                  className="flex flex-col md:flex-row md:items-center justify-between bg-slate-900 p-6 rounded-2xl border border-slate-800 hover:border-purple-500/30 transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-purple-500/10 rounded-xl mt-1">
                      <FileText className="h-6 w-6 text-purple-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white group-hover:text-purple-400 transition-colors">
                        {rapport.titre}
                      </h4>
                      {rapport.scoreConformite && (
                        <p className="text-emerald-400 text-sm mt-1">
                          Score : {rapport.scoreConformite}%
                        </p>
                      )}
                      <p className="text-xs text-slate-500 mt-2 flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5" />
                        Généré le {new Date(rapport.genereLe).toLocaleDateString('fr-FR', {
                          day: 'numeric', month: 'long', year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-5 md:mt-0">
                    <Button variant="outline" size="sm">
                      <Eye className="mr-2 h-4 w-4" />
                      Voir
                    </Button>
                    <Button 
                      onClick={() => handleDownload(rapport)}
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Télécharger
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}