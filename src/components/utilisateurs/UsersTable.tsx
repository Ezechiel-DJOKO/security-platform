'use client';

import { useState, useEffect } from 'react';
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

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/utilisateurs', { cache: 'no-store' });
      if (!res.ok) throw new Error('Erreur');
      const data = await res.json();
      setUsers(data);
    } catch (error) {
      console.error(error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (id: string) => {
    await fetch(`/api/utilisateurs/${id}/toggle`, { method: 'PATCH' });
    fetchUsers();
  };

  const changeRole = async (id: string, newRole: string) => {
    await fetch(`/api/utilisateurs/${id}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    });
    fetchUsers();
  };

  if (loading) return <div className="p-12 text-center text-slate-400">Chargement des utilisateurs...</div>;

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-900 border-b border-slate-800">
          <tr>
            <th className="px-6 py-4 text-left">Utilisateur</th>
            <th className="px-6 py-4 text-left">Email</th>
            <th className="px-6 py-4 text-left">Rôle</th>
            <th className="px-6 py-4 text-left">Statut</th>
            <th className="px-6 py-4 text-left">Créé le</th>
            <th className="px-6 py-4 text-left">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-slate-900/50">
              <td className="px-6 py-4 font-medium">
                {user.prenomUtilisateur} {user.nomUtilisateur}
              </td>
              <td className="px-6 py-4 text-slate-300">{user.email}</td>
              <td className="px-6 py-4">
                <select 
                  value={user.role}
                  onChange={(e) => changeRole(user.id, e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded px-3 py-1 text-sm"
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
                  <Button variant="outline" size="sm" onClick={() => toggleActive(user.id)}>
                    <UserCheck className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Edit3 className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}