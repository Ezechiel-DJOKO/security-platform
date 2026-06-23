// src/components/dashboard/VulnerabilitesTechnicien.tsx
'use client';
import { useState, useEffect } from 'react';
import { AlertTriangle, Eye, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

type VulnAssigne = {
  id: string;
  titre: string;
  severite: string;
  cveId?: string;
  scoreCVSS?: number;
  statut: string;
  planCorrection?: {
    id: string;
    priorite: string;
    dateEcheance: string;
  };
};

export default function VulnerabilitesTechnicien() {
  const [vulnerabilites, setVulnerabilites] = useState<VulnAssigne[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/vulnerabilities?assigneA=me');
      if (!res.ok) throw new Error();
      const { data } = await res.json();
      setVulnerabilites(data || []);
    } catch {
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <div className="text-slate-400">Chargement des vulnérabilités assignées...</div>;

  if (vulnerabilites.length === 0) {
    return (
      <div className="bg-slate-950 border border-slate-800 rounded-3xl p-16 text-center">
        <AlertTriangle className="h-16 w-16 mx-auto text-orange-400 mb-6" />
        <h3 className="text-2xl font-semibold text-white">Aucune vulnérabilité assignée</h3>
        <p className="text-slate-400 mt-3">Vous n’avez actuellement aucune vulnérabilité à traiter.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      {vulnerabilites.map((vuln) => (
        <div key={vuln.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all">
          <div className="flex flex-col md:flex-row justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-4">
                <div className={`px-4 py-1 rounded-full text-sm font-medium ${
                  vuln.severite === 'CRITICAL' ? 'bg-red-500/10 text-red-400' :
                  vuln.severite === 'HIGH' ? 'bg-orange-500/10 text-orange-400' : 
                  'bg-yellow-500/10 text-yellow-400'
                }`}>
                  {vuln.severite}
                </div>
                <h3 className="text-lg font-semibold text-white">{vuln.titre}</h3>
              </div>
              {vuln.cveId && <p className="text-xs text-slate-500 mt-2">{vuln.cveId}</p>}
            </div>

            <div className="flex items-center gap-4">
              {vuln.planCorrection && (
                <div className="text-sm">
                  <span className="text-slate-500">Échéance :</span><br />
                  <span className="font-medium text-white">
                    {new Date(vuln.planCorrection.dateEcheance).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              )}

              <Link
                href={`/vulnerabilities/${vuln.id}`}
                className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm transition"
              >
                <Eye className="h-4 w-4" />
                Détails & Correction
              </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}