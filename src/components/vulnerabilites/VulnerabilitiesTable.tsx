'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { Severite } from '@prisma/client';

interface Vulnerability {
  id: string;
  cveId: string | null;
  titre: string;
  description: string | null;
  severite: Severite | null;
  scoreCVSS: number | null;
  risqueRelatif: number | null;
  statut: string;
  recommandation: string | null;
}

interface ApiVulnerability {
  id: string;
  cveId?: string | null;
  titre: string;
  description?: string | null;
  severite?: Severite | null;
  scoreCVSS?: number | null;
  risqueRelatif?: number | null;
  statut?: string | null;
  recommandation?: string | null;
}

export function VulnerabilitiesTable() {
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severiteFilter, setSeveriteFilter] = useState('');
  const isFirstRender = useRef(true);

  const fetchVulnerabilities = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (severiteFilter) params.append('severite', severiteFilter);

      const res = await fetch(`/api/vulnerabilities?${params}`);
      const data: { data?: ApiVulnerability[] } = await res.json();

      const mappedVulns: Vulnerability[] = (data.data ?? []).map((v) => ({
        id: v.id,
        cveId: v.cveId ?? null,
        titre: v.titre,
        description: v.description ?? null,
        severite: v.severite ?? null,
        scoreCVSS: v.scoreCVSS ?? null,
        risqueRelatif: v.risqueRelatif ?? null,
        statut: v.statut ?? 'OUVERTE',
        recommandation: v.recommandation ?? null,
      }));

      setVulnerabilities(mappedVulns);
    } catch (error) {
      console.error('Erreur de chargement des vulnérabilités:', error);
    } finally {
      setLoading(false);
    }
  }, [search, severiteFilter]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      fetchVulnerabilities();
      return;
    }

    const timer = setTimeout(fetchVulnerabilities, 300);
    return () => clearTimeout(timer);
  }, [search, severiteFilter, fetchVulnerabilities]);

  const getSeveriteClass = (severite: Severite | null) => {
    switch (severite) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 font-bold border border-red-200 dark:border-red-800';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 font-semibold border border-orange-200 dark:border-orange-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800';
      case 'LOW':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400 border border-slate-200 dark:border-slate-800';
    }
  };

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex flex-wrap gap-3 items-center bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
        <input
          type="text"
          placeholder="Rechercher CVE, titre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
        <select
          value={severiteFilter}
          onChange={(e) => setSeveriteFilter(e.target.value)}
          className="w-40 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        >
          <option value="">Toutes les sévérités</option>
          <option value="CRITICAL">Critique</option>
          <option value="HIGH">Haute</option>
          <option value="MEDIUM">Moyenne</option>
          <option value="LOW">Basse</option>
        </select>

        <button
          onClick={fetchVulnerabilities}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Rafraîchir
        </button>
      </div>

      {/* Tableau */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 font-medium">
            <tr>
              <th className="p-4">CVE / Titre</th>
              <th className="p-4">Sévérité</th>
              <th className="p-4">CVSS</th>
              <th className="p-4">Risque Relatif</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {loading && vulnerabilities.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-500">
                  Chargement des vulnérabilités...
                </td>
              </tr>
            ) : vulnerabilities.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-500">
                  Aucune vulnérabilité trouvée.
                </td>
              </tr>
            ) : (
              vulnerabilities.map((vuln) => (
                <tr key={vuln.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="p-4">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {vuln.cveId || 'N/A'}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 max-w-xs">
                        {vuln.titre}
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${getSeveriteClass(vuln.severite)}`}>
                      {vuln.severite || 'LOW'}
                    </span>
                  </td>
                  <td className="p-4 font-mono font-medium text-slate-700 dark:text-slate-300">
                    {vuln.scoreCVSS ?? '-'}
                  </td>
                  <td className="p-4">
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {vuln.risqueRelatif?.toFixed(1) ?? '-'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}