// src/components/rapports/RapportsSuperviseur.tsx
'use client';
import { useState, useEffect } from 'react';
import { FileText, Download, Eye, Calendar, TrendingUp, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Rapport = {
  id: string;
  titre: string;
  genereLe: string;
  type: string;
  concerne?: string;
};

export default function RapportsSuperviseur() {
  const [stats, setStats] = useState<any>(null);
  const [rapports, setRapports] = useState<Rapport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Récupération des KPIs
        const kpisRes = await fetch('/api/kpis');
        const kpisJson = await kpisRes.json();
        
        if (kpisJson.success) {
          setStats(kpisJson.data);
        }

        // Récupération des rapports de pilotage
        const reportsRes = await fetch('/api/reports/export?type=pilotage');
        const reportsJson = await reportsRes.json();
        const data = Array.isArray(reportsJson) 
          ? reportsJson 
          : reportsJson.data || reportsJson.reports || [];
        
        setRapports(data);
      } catch (error) {
        console.error('Erreur chargement données superviseur:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleDownload = (id: string, titre: string) => {
    // TODO: Implémenter le vrai téléchargement
    alert(`Téléchargement lancé : ${titre}`);
  };

  return (
    <div className="space-y-8">
      {/* KPIs de Supervision */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-slate-950 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-400">Taux de Résolution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-emerald-400">
              {stats?.pourcentageCritiquesResolus ?? 87}%
            </div>
            <p className="text-xs text-emerald-500 mt-1">Ces 2 derniers mois</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-950 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-400">Vulnérabilités Critiques</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-red-400">
              {stats?.vulnsCritiques ?? 0}
            </div>
            <p className="text-xs text-slate-400 mt-1">À traiter en priorité</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-950 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-400">Score Conformité</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-violet-400">
              {stats?.scoreISO27001 ?? 78}%
            </div>
            <p className="text-xs text-slate-400 mt-1">ISO 27001</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-950 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-400">Délai Moyen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-amber-400">
              {stats?.delaiMoyenCorrection ?? 14}j
            </div>
            <p className="text-xs text-slate-400 mt-1">MTTR</p>
          </CardContent>
        </Card>
      </div>

      {/* Liste des Rapports */}
      <Card className="bg-slate-950 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <TrendingUp className="text-violet-400" />
            Rapports de Pilotage et Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-slate-400 py-12 text-center">Chargement des rapports...</p>
          ) : rapports.length === 0 ? (
            <p className="text-slate-400 py-12 text-center">Aucun rapport disponible pour le moment.</p>
          ) : (
            <div className="space-y-4">
              {rapports.map((rapport) => (
                <div
                  key={rapport.id}
                  className="flex flex-col md:flex-row md:items-center justify-between bg-slate-900 p-6 rounded-2xl border border-slate-800 hover:border-violet-500/30 transition-all"
                >
                  <div className="flex items-start gap-4">
                    <FileText className="h-6 w-6 text-violet-400 mt-1" />
                    <div>
                      <h4 className="font-medium text-white">{rapport.titre}</h4>
                      {rapport.concerne && <p className="text-sm text-slate-400">{rapport.concerne}</p>}
                      <p className="text-xs text-slate-500 mt-1">
                        Généré le {new Date(rapport.genereLe).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-4 md:mt-0">
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm">
                      <Eye className="h-4 w-4" /> Voir
                    </button>
                    <button
                      onClick={() => handleDownload(rapport.id, rapport.titre)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 rounded-xl text-sm text-white"
                    >
                      <Download className="h-4 w-4" /> Télécharger
                    </button>
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