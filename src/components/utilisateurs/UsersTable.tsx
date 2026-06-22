'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Edit3, Trash2, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Utilisateur = {
  id: string;
  nomUtilisateur: string;
  prenomUtilisateur: string;
  email: string;
  role: string;
  actif: boolean;
  createdAt: string;
};

export default function UsersTable() {
  const [users, setUsers] = useState<Utilisateur[]>([]);
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(true);

  // Define fetchUsers BEFORE using it in useEffect
  const fetchUsers = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    try {
      const res = await fetch('/api/utilisateurs', { cache: 'no-store' });
      if (!res.ok) throw new Error('Erreur');
      const data = await res.json();
      
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setUsers(data);
        setLoading(false);
      }
    } catch (error) {
      console.error(error);
      if (isMountedRef.current) {
        setUsers([]);
        setLoading(false);
      }
    }
  }, []);

  // Now useEffect can safely use fetchUsers with proper mount handling
  useEffect(() => {
    isMountedRef.current = true;
    
    const loadUsers = async () => {
      await fetchUsers();
    };
    
    loadUsers();
    
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchUsers]);

  const toggleActive = useCallback(async (id: string) => {
    try {
      await fetch(`/api/utilisateurs/${id}/toggle`, { method: 'PATCH' });
      await fetchUsers();
    } catch (error) {
      console.error('Error toggling user status:', error);
    }
  }, [fetchUsers]);

  const changeRole = useCallback(async (id: string, newRole: string) => {
    try {
      await fetch(`/api/utilisateurs/${id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      await fetchUsers();
    } catch (error) {
      console.error('Error changing user role:', error);
    }
  }, [fetchUsers]);

  if (loading) {
    return (
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden p-12 text-center">
        <div className="text-slate-400">Chargement des utilisateurs...</div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden p-12 text-center">
        <div className="text-slate-400">Aucun utilisateur trouvé</div>
      </div>
    );
  }

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 border-b border-slate-800">
            <tr>
              <th className="px-6 py-4 text-left text-slate-300 font-medium">Utilisateur</th>
              <th className="px-6 py-4 text-left text-slate-300 font-medium">Email</th>
              <th className="px-6 py-4 text-left text-slate-300 font-medium">Rôle</th>
              <th className="px-6 py-4 text-left text-slate-300 font-medium">Statut</th>
              <th className="px-6 py-4 text-left text-slate-300 font-medium">Créé le</th>
              <th className="px-6 py-4 text-left text-slate-300 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-900/50 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-100">
                  {user.prenomUtilisateur} {user.nomUtilisateur}
                </td>
                <td className="px-6 py-4 text-slate-300">{user.email}</td>
                <td className="px-6 py-4">
                  <select 
                    value={user.role}
                    onChange={(e) => changeRole(user.id, e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded px-3 py-1 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    aria-label={`Changer le rôle de ${user.prenomUtilisateur}`}
                  >
                    <option value="ADMIN">Administrateur</option>
                    <option value="SUPERVISEUR">Superviseur</option>
                    <option value="AUDITEUR">Auditeur</option>
                  </select>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                    user.actif ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                  }`}>
                    {user.actif ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-400">
                  {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => toggleActive(user.id)}
                      className="hover:bg-slate-800"
                      aria-label={user.actif ? "Désactiver l'utilisateur" : "Activer l'utilisateur"}
                    >
                      <UserCheck className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="hover:bg-slate-800"
                      aria-label={`Modifier ${user.prenomUtilisateur}`}
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
                      aria-label={`Supprimer ${user.prenomUtilisateur}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}