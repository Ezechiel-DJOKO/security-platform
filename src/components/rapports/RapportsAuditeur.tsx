'use client';

import { useState, useEffect } from 'react';
import {
  FileText, Download, Calendar, ShieldCheck,
  ScanLine, Award, AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';

type Rapport = {
  id: string;
  titre: string;
  genereLe: string;
  technicien?: string;
  type: string;
};

export default function RapportsAuditeur() {
  const [stats, setStats] = useState<any>(null);
  const [rapports, setRapports] = useState<Rapport[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      // KPIs
      const kpisRes = await fetch('/api/kpis');
      if (kpisRes.ok) {
        const kpisJson = await kpisRes.json();
        if (kpisJson.success) setStats(kpisJson.data);
      }

      // Liste des assignations
      const reportsRes = await fetch('/api/reports/auditeur/assignations');
      if (reportsRes.ok) {
        const data = await reportsRes.json();
        setRapports(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Erreur chargement rapports auditeur:", err);
    } finally {
      setLoading(false);
    }
  };

  const downloadAssignationReport = async (planId: string, titre: string) => {
    toast.loading("Génération du rapport...", { id: planId });
    try {
      const res = await fetch(`/api/reports/auditeur/plan/${planId}`);
      if (!res.ok) throw new Error();
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Assignation_${titre.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success("Rapport téléchargé !", { id: planId });
    } catch {
      toast.error("Erreur lors de la génération");
    }
  };

  const downloadFinalReport = async () => {
    toast.loading("Génération du rapport final...", { id: "final-auditor" });
    try {
      const res = await fetch('/api/reports/auditeur/final');
      if (!res.ok) throw new Error();
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Rapport_Final_Auditeur_${new Date().toISOString().slice(0,10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success("Rapport final téléchargé !", { id: "final-auditor" });
    } catch {
      toast.error("Erreur lors de la génération");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-400">Chargement des rapports...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold flex items-center gap-3">
          <Award className="text-purple-400" />
          Mes Rapports d'Audit
        </h2>
        <Button 
          onClick={downloadFinalReport}
          className="bg-gradient-to-r from-violet-600 to-purple-600"
        >
          <Award className="mr-2 h-5 w-5" />
          Rapport Final d'Auditeur
        </Button>
      </div>

      {/* KPIs Cards */}
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

      {/* Liste des rapports */}
      <Card className="bg-slate-950 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <FileText className="text-purple-400" />
            Assignations Terminées
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rapports.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              Aucune assignation terminée pour le moment.
            </div>
          ) : (
            <div className="space-y-4">
              {rapports.map((rapport) => (
                <div key={rapport.id} className="flex flex-col md:flex-row justify-between bg-slate-900 p-6 rounded-2xl border border-slate-800 hover:border-purple-500/30">
                  <div className="flex items-start gap-4">
                    <FileText className="h-10 w-10 text-purple-400 mt-1" />
                    <div>
                      <h4 className="font-semibold">{rapport.titre}</h4>
                      {rapport.technicien && <p className="text-sm text-slate-400">Technicien : {rapport.technicien}</p>}
                      <p className="text-xs text-slate-500">
                        {new Date(rapport.genereLe).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => downloadAssignationReport(rapport.id, rapport.titre)}
                    className="bg-purple-600 hover:bg-purple-700 mt-4 md:mt-0"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Télécharger
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}