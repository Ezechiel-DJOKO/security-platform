'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { User, X } from 'lucide-react';
import { assignVulnerability } from '@/actions/vulnerabilityActions';

interface UserData {
  id: string;
  prenom: string;
  nom: string;
  role: string;
}

interface VulnerabilityData {
  id: string;
  titre: string;
  cveId?: string | null;
}

interface AssignModalProps {
  open: boolean;
  onClose: () => void;
  vulnerability: VulnerabilityData;
  onSuccess: () => void;
}

export default function AssignModal({ open, onClose, vulnerability, onSuccess }: AssignModalProps) {
  const [users, setUsers] = useState<UserData[]>([]);
  const [assigneA, setAssigneA] = useState('');
  const [priorite, setPriorite] = useState<'BASSE' | 'MOYENNE' | 'HAUTE' | 'CRITIQUE'>('HAUTE');
  const [commentaire, setCommentaire] = useState('');
  const [loading, setLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const hasLoadedUsers = useRef(false);

  const fetchUsers = useCallback(async () => {
    if (hasLoadedUsers.current && users.length > 0) return;
    
    try {
      setUsersLoading(true);
      const res = await fetch('/api/users');
      if (res.ok) {
        const data: { data?: UserData[] } | UserData[] = await res.json();
        const userList = Array.isArray(data) ? data : (data.data ?? []);
        setUsers(userList);
        hasLoadedUsers.current = true;
      } else {
        console.error('Erreur lors du chargement des utilisateurs');
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setUsersLoading(false);
    }
  }, [users.length]);

  // ✅ CORRECTION : useEffect au lieu d'accès direct au ref pendant le render
  useEffect(() => {
    if (open && !hasLoadedUsers.current) {
      fetchUsers();
    }
  }, [open, fetchUsers]);

  // Reset du flag quand la modale se ferme (pour permettre rechargement si besoin)
  useEffect(() => {
    if (!open) {
      hasLoadedUsers.current = false;
    }
  }, [open]);

  const handleAssign = async () => {
    if (!assigneA) return;

    setLoading(true);
    try {
      await assignVulnerability({
        vulnerabiliteId: vulnerability.id,
        assigneA,
        priorite,
        commentaire: commentaire || undefined,
      });

      onSuccess();
      onClose();

      // Reset form
      setAssigneA('');
      setCommentaire('');
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      alert(`Erreur lors de l'assignation : ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg border border-slate-200 dark:bg-slate-900 dark:border-slate-800">

        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-50">
            <User className="h-5 w-5 text-blue-500" />
            <span>Assigner la vulnérabilité</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 py-4">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Vulnérabilité</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{vulnerability?.titre}</p>
            {vulnerability?.cveId && (
              <p className="text-xs text-slate-400 mt-0.5">CVE : {vulnerability.cveId}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Assigner à</label>
            <select
              value={assigneA}
              onChange={(e) => setAssigneA(e.target.value)}
              disabled={usersLoading}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-850 dark:text-slate-50 dark:disabled:bg-slate-800"
            >
              <option value="">
                {usersLoading ? 'Chargement des utilisateurs...' : 'Sélectionner un utilisateur'}
              </option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.prenom} {user.nom} ({user.role})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Priorité</label>
            <select
              value={priorite}
              onChange={(e) => setPriorite(e.target.value as 'BASSE' | 'MOYENNE' | 'HAUTE' | 'CRITIQUE')}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-850 dark:text-slate-50"
            >
              <option value="CRITIQUE">Critique</option>
              <option value="HAUTE">Haute</option>
              <option value="MOYENNE">Moyenne</option>
              <option value="BASSE">Basse</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Commentaire (optionnel)</label>
            <textarea
              className="w-full min-h-[80px] rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-850 dark:text-slate-50"
              placeholder="Ajouter un message pour l'assigné..."
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleAssign}
            disabled={loading || !assigneA}
            className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Assignation en cours...' : 'Confirmer l\'assignation'}
          </button>
        </div>

      </div>
    </div>
  );
}