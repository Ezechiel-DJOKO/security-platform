'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Eye, UserPlus, RefreshCw } from 'lucide-react';
import { markAsCorrected } from '@/actions/vulnerabilityActions';
import VulnerabilityDetailModal from './VulnerabilityDetailModal';
import AssignModal from './AssignModal';

// Interface pour typer les vulnérabilités
interface Vulnerability {
  id: string;
  cveId?: string;
  titre: string;
  severite?: string;
  scoreCVSS?: number;
  risqueRelatif?: number;
  statut?: string;
}

export function VulnerabilitiesTable() {
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severiteFilter, setSeveriteFilter] = useState('');
  const [statutFilter, setStatutFilter] = useState('');
  const [selectedVuln, setSelectedVuln] = useState<Vulnerability | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showAssign, setShowAssign] = useState(false);

  // Ref pour éviter le fetch au montage initial si déjà chargé
  const isFirstRender = useRef(true);

  // Fonction fetch avec useCallback + typage
  const fetchVulnerabilities = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (severiteFilter) params.append('severite', severiteFilter);
      if (statutFilter) params.append('statut', statutFilter);

      const res = await fetch(`/api/vulnerabilities?${params}`);
      const data: { data?: Vulnerability[] } = await res.json();

      setVulnerabilities(data.data ?? []);
    } catch (error) {
      console.error('Erreur de chargement:', error);
    } finally {
      setLoading(false);
    }
  }, [search, severiteFilter, statutFilter]);

  // useEffect corrigé : pas de setState synchrone direct
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      fetchVulnerabilities();
      return;
    }

    // Debounce pour éviter les re-renders en cascade lors de la saisie
    const timer = setTimeout(() => {
      fetchVulnerabilities();
    }, 300);

    return () => clearTimeout(timer);
  }, [search, severiteFilter, statutFilter, fetchVulnerabilities]);

  const handleCorrect = async (id: string) => {
    if (confirm('Marquer comme corrigée ?')) {
      await markAsCorrected({ vulnerabiliteId: id });
      fetchVulnerabilities();
    }
  };

  const getSeveriteClass = (severite: string = '') => {
    switch (severite.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 font-bold border border-red-200 dark:border-red-800';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 font-semibold border border-orange-200 dark:border-orange-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800';
    }
  };

  return (
    <div className="space-y-4">
      {/* Zone des filtres */}
      <div className="flex flex-wrap gap-3 items-center bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
        <input
          type="text"
          placeholder="Rechercher CVE, titre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder-slate-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-850 dark:text-slate-50"
        />

        <select
          value={severiteFilter}
          onChange={(e) => setSeveriteFilter(e.target.value)}
          className="w-40 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-850 dark:text-slate-50"
        >
          <option value="">Toutes les sévérités</option>
          <option value="CRITICAL">Critique</option>
          <option value="HIGH">Haute</option>
          <option value="MEDIUM">Moyenne</option>
          <option value="LOW">Basse</option>
        </select>

        <select
          value={statutFilter}
          onChange={(e) => setStatutFilter(e.target.value)}
          className="w-40 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-850 dark:text-slate-50"
        >
          <option value="">Tous les statuts</option>
          <option value="OUVERTE">Ouverte</option>
          <option value="EN_COURS">En cours</option>
          <option value="CORRIGEE">Corrigée</option>
          <option value="VERIFIEE">Vérifiée</option>
        </select>

        <button
          onClick={fetchVulnerabilities}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
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
              <th className="p-4">Statut</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {loading && vulnerabilities.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  Chargement des vulnérabilités...
                </td>
              </tr>
            ) : vulnerabilities.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
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
                  <td className="p-4">
                    <span className="inline-flex items-center rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-400 bg-slate-50 dark:bg-slate-800">
                      {vuln.statut}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedVuln(vuln);
                          setShowDetail(true);
                        }}
                        className="rounded p-2 text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 shadow-sm transition-colors"
                        title="Voir les détails"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => {
                          setSelectedVuln(vuln);
                          setShowAssign(true);
                        }}
                        className="rounded p-2 text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 shadow-sm transition-colors"
                        title="Assigner"
                      >
                        <UserPlus className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => handleCorrect(vuln.id)}
                        className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
                      >
                        Corriger
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modales */}
      {selectedVuln && (
        <>
          <VulnerabilityDetailModal
            open={showDetail}
            onClose={() => setShowDetail(false)}
            vulnerability={selectedVuln}
          />
          <AssignModal
            open={showAssign}
            onClose={() => setShowAssign(false)}
            vulnerability={selectedVuln}
            onSuccess={fetchVulnerabilities}
          />
        </>
      )}
    </div>
  );
}