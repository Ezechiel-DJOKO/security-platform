'use client';
import { ShieldCheck, RefreshCw } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useEffect, useState, useCallback } from 'react';
import { Button } from './ui/button';

type DomainScore = {
  domaine: string;
  score: number;
  totalControles: number;
  controlesEvalues: number;
  controlesNonConformes: number;
  vulnsLiees: number;
};

type GapAnalysisResult = {
  scoreGlobal: number;
  domaines: DomainScore[];
  totalControles: number;
  totalActifs: number;
  lastUpdated: string;
};

export default function ConformiteContent() {
  const { data: session, status } = useSession();
  const [analysis, setAnalysis] = useState<GapAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadGapAnalysis = useCallback(async () => {
    try {
      setError(null);
      if (refreshing) setRefreshing(true);

      const res = await fetch('/api/compliance', {
        cache: 'no-store',
        next: { revalidate: 0 },
      });

      if (!res.ok) throw new Error('Impossible de charger les données');

      const response = await res.json();

      // ✅ Correction importante : l'API renvoie les données dans response.data
      const analysisData = response.data || response;
      setAnalysis(analysisData);
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement de l'analyse");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  useEffect(() => {
    if (session) {
      loadGapAnalysis();
    } else {
      setLoading(false);
    }
  }, [session, loadGapAnalysis]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadGapAnalysis();
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-400">
        Calcul de l'analyse Gap ISO 27001 en cours...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-12 text-amber-500">
        Vous devez être connecté pour voir cette page.
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center py-12">
        {error}
        <button
          onClick={handleRefresh}
          className="mt-4 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400"
        >
          Réessayer
        </button>
      </div>
    );
  }

  const globalScore = analysis?.scoreGlobal || 0;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Gap Analysis ISO 27001</h1>
          <p className="text-slate-400 mt-2">Évaluation de la conformité par domaine</p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* Score Global */}
      <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-700 rounded-3xl p-10 text-center">
        <div className="text-8xl font-bold text-white mb-2">{globalScore}%</div>
        <p className="text-2xl font-semibold text-emerald-400">Niveau de Conformité Global</p>
        <p className="text-slate-400 mt-3">
          Basé sur {analysis?.totalControles || 0} contrôles •{' '}
          {analysis?.totalActifs || 0} actifs surveillés
        </p>
      </div>

      {/* Scores par Domaine */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {analysis?.domaines?.map((domaine, i) => (
          <div
            key={i}
            className="bg-slate-950 border border-slate-800 rounded-3xl p-6 hover:border-slate-600 transition-all"
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-semibold text-lg text-white">{domaine.domaine}</h3>
              <ShieldCheck className="w-8 h-8 text-emerald-500" />
            </div>

            <div className="flex justify-between items-end mb-3">
              <span className="text-5xl font-bold text-white">{domaine.score}</span>
              <span className="text-slate-400">/100</span>
            </div>

            <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                style={{ width: `${domaine.score}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm text-slate-400">
              <div>
                <p className="text-xs">Contrôles</p>
                <p className="text-white font-medium">{domaine.totalControles}</p>
              </div>
              <div>
                <p className="text-xs">Non conformes</p>
                <p className="text-rose-400 font-medium">{domaine.controlesNonConformes}</p>
              </div>
              <div>
                <p className="text-xs">Vulnérabilités</p>
                <p className="text-amber-400 font-medium">{domaine.vulnsLiees}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}