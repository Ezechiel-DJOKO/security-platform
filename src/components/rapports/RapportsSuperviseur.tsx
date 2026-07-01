'use client';
import { useState, useEffect } from 'react';
import { FileText, Download, Eye, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Rapport = {
  id: string;
  titre: string;
  genereLe: string;
  concerne?: string;
  corrigePar?: string;
  verifiePar?: string;
};

export default function RapportsSuperviseur() {
  const [rapports, setRapports] = useState<Rapport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRapports();
  }, []);

  const fetchRapports = async () => {
    try {
      setError(null);
      console.log("🔄 Appel API : /api/reports/superviseur/verified");

      const res = await fetch('/api/reports/superviseur/verified');
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      console.log("📊 Données reçues :", data);

      setRapports(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("❌ Erreur :", err);
      setError(err.message || "Impossible de charger les rapports");
      setRapports([]);
    } finally {
      setLoading(false);
    }
  };

  const generateGlobalReport = () => {
    window.open('/api/reports/superviseur?format=pdf', '_blank');
  };

  const handleDownload = (id: string, titre: string) => {
    window.open(`/api/reports/superviseur/${id}`, '_blank');
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-white">Rapports de Supervision</h1>
          <p className="text-slate-400 mt-1">Validation finale et suivi des corrections</p>
        </div>

        <button
          onClick={generateGlobalReport}
          className="flex items-center gap-3 px-6 py-3 bg-violet-600 hover:bg-violet-500 rounded-2xl text-white font-medium"
        >
          <FileText className="w-5 h-5" />
          Générer le Rapport Final
        </button>
      </div>

      <Card className="bg-slate-950 border-slate-800">
        <CardHeader>
          <CardTitle>Rapports Automatiques (Vulnérabilités Vérifiées)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <div className="py-20 text-center">Chargement...</div>}

          {error && (
            <div className="py-12 text-center text-red-400 flex flex-col items-center gap-2">
              <AlertCircle className="w-8 h-8" />
              <p>Erreur : {error}</p>
              <button onClick={fetchRapports} className="text-sm underline mt-4">
                Réessayer
              </button>
            </div>
          )}

          {!loading && !error && rapports.length === 0 && (
            <div className="py-20 text-center text-slate-400">
              Aucune vulnérabilité vérifiée trouvée.<br />
              Passez des vulnérabilités en statut <span className="text-emerald-400">VERIFIEE</span> pour les voir ici.
            </div>
          )}

          {!loading && rapports.length > 0 && (
            <div className="space-y-4">
              {rapports.map((r) => (
                <div key={r.id} className="bg-slate-900 p-6 rounded-2xl border border-slate-700">
                  <div className="flex justify-between">
                    <div>
                      <h4 className="font-semibold">{r.titre}</h4>
                      {r.concerne && <p className="text-slate-400 text-sm">{r.concerne}</p>}
                      {r.corrigePar && <p className="text-xs text-emerald-400">Corrigé par : {r.corrigePar}</p>}
                    </div>
                    <button
                      onClick={() => handleDownload(r.id, r.titre)}
                      className="bg-emerald-600 hover:bg-emerald-500 px-5 py-2 rounded-xl text-sm"
                    >
                      <Download className="inline w-4 h-4 mr-1" /> PDF
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