// src/components/rapports/RapportsAuditeur.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileText, Download, Award, AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';

type Assignation = {
  id: string;
  titre: string;
  severite: string;
  cveId: string | null;
  technicien: string;
  genereLe: string;
  dateEcheance: string;
  dateResolution: string | null;
  statut: 'en_cours' | 'termine' | 'en_retard' | 'annule';
  type: string;
};

export default function RapportsAuditeur() {
  const [assignations, setAssignations] = useState<Assignation[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [lastUpdate, setLastUpdate]     = useState<Date>(new Date());

  // ── Fetch ────────────────────────────────────────────────

  const fetchAssignations = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const res  = await fetch('/api/reports/auditeur/assignations', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      const json = await res.json();

      if (json.success && Array.isArray(json.data)) {
        setAssignations(json.data);
        setLastUpdate(new Date());
      }
    } catch (err) {
      console.error('Erreur fetch assignations:', err);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  // ── Premier chargement ───────────────────────────────────

  useEffect(() => {
    fetchAssignations();
  }, [fetchAssignations]);

  // ── Polling toutes les 30 secondes ───────────────────────

  useEffect(() => {
    const interval = setInterval(() => {
      fetchAssignations(true); // silent = pas de spinner
    }, 30_000);

    return () => clearInterval(interval); // cleanup
  }, [fetchAssignations]);

  // ── Export rapport final ─────────────────────────────────

  const exportRapportFinal = async () => {
    const toastId = 'final-auditor';
    toast.loading("Generation du rapport final...", { id: toastId });
    try {
      const res = await fetch('/api/reports/auditeur/final');
      if (!res.ok) throw new Error('Echec');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `Rapport_Final_Auditeur_${new Date().toISOString().slice(0,10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Rapport final telecharge !", { id: toastId });
    } catch {
      toast.error("Erreur lors de la generation", { id: toastId });
    }
  };

  // ── Export rapport individuel ────────────────────────────

  const exportRapportDetail = async (id: string, titre: string) => {
    const toastId = id;
    toast.loading("Generation du rapport...", { id: toastId });
    try {
      const res = await fetch(`/api/reports/auditeur/plan/${id}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Echec');
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `Rapport_${titre.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Rapport telecharge !", { id: toastId });
    } catch (err: any) {
      toast.error(`Erreur : ${err.message}`, { id: toastId });
    }
  };

  // ── Helpers statut ───────────────────────────────────────

  const statutStyle = (statut: string) => {
    switch (statut) {
      case 'termine':   return 'bg-emerald-900/50 text-emerald-300';
      case 'en_retard': return 'bg-red-900/50 text-red-300';
      case 'annule':    return 'bg-slate-700/50 text-slate-400';
      default:          return 'bg-amber-900/50 text-amber-300';
    }
  };

  const statutLabel = (statut: string) => {
    switch (statut) {
      case 'termine':   return 'Termine';
      case 'en_retard': return 'En retard';
      case 'annule':    return 'Annule';
      default:          return 'En cours';
    }
  };

  // ── Compteurs ────────────────────────────────────────────

  const termines  = assignations.filter(a => a.statut === 'termine').length;
  const enCours   = assignations.filter(a => a.statut === 'en_cours').length;
  const enRetard  = assignations.filter(a => a.statut === 'en_retard').length;

  // ── Loading ──────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────

  return (
    <div className="space-y-8">

      {/* En-tête */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-3">
            <Award className="text-purple-400" />
            Rapports d'Audit
          </h2>
          <p className="text-slate-400 text-sm">
            Derniere mise a jour : {lastUpdate.toLocaleTimeString('fr-FR')}
          </p>
        </div>

        <div className="flex gap-3">
          {/* Bouton refresh manuel */}
          <Button
            onClick={() => fetchAssignations()}
            variant="outline"
            disabled={refreshing}
            className="border-slate-600 text-slate-300"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>

          <Button
            onClick={exportRapportFinal}
            className="bg-gradient-to-r from-violet-600 to-purple-600"
          >
            <Download className="mr-2 h-5 w-5" />
            Rapport Final
          </Button>
        </div>
      </div>

      {/* Compteurs rapides */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-950 border border-emerald-900 rounded-2xl p-4 text-center">
          <p className="text-3xl font-bold text-emerald-400">{termines}</p>
          <p className="text-xs text-slate-400 mt-1">Terminees</p>
        </div>
        <div className="bg-slate-950 border border-amber-900 rounded-2xl p-4 text-center">
          <p className="text-3xl font-bold text-amber-400">{enCours}</p>
          <p className="text-xs text-slate-400 mt-1">En cours</p>
        </div>
        <div className="bg-slate-950 border border-red-900 rounded-2xl p-4 text-center">
          <p className="text-3xl font-bold text-red-400">{enRetard}</p>
          <p className="text-xs text-slate-400 mt-1">En retard</p>
        </div>
      </div>

      {/* Liste des assignations */}
      <Card className="bg-slate-950 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="text-purple-400" />
              Assignations ({assignations.length})
            </div>
            {/* Indicateur polling */}
            <span className="text-xs text-slate-500 font-normal">
              Auto-refresh toutes les 30s
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assignations.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <AlertCircle className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>Aucune assignation trouvee.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {assignations.map((a) => (
                <div
                  key={a.id}
                  className={`flex items-center justify-between p-4 rounded-xl border transition
                    ${a.statut === 'termine'
                      ? 'bg-emerald-950/20 border-emerald-900/50 hover:border-emerald-700'
                      : 'bg-slate-900 border-slate-800 hover:border-purple-500/30'
                    }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-white truncate">{a.titre}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statutStyle(a.statut)}`}>
                        {statutLabel(a.statut)}
                      </span>
                      {a.cveId && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-slate-700 text-slate-300">
                          {a.cveId}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-400 mt-1">
                      {a.technicien} •{' '}
                      Echeance : {new Date(a.dateEcheance).toLocaleDateString('fr-FR')}
                      {a.dateResolution && (
                        <span className="text-emerald-400 ml-2">
                          • Resolu le {new Date(a.dateResolution).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </p>
                  </div>

                  {/* PDF disponible pour tous les statuts */}
                  <Button
                    onClick={() => exportRapportDetail(a.id, a.titre)}
                    variant="outline"
                    size="sm"
                    className={`ml-4 shrink-0 ${
                      a.statut === 'termine'
                        ? 'border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10'
                        : 'border-purple-500/50 text-purple-400 hover:bg-purple-500/10'
                    }`}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    PDF
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