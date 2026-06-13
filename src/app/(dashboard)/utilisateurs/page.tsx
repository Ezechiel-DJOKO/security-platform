import { RoleGate } from '@/components/RoleGate';   // Ajuste le chemin si besoin
import UsersTable from '@/components/utilisateurs/UsersTable';

export default function UtilisateursPage() {
  return (
    <RoleGate allowedRoles={['ADMIN']}>
      <div className="p-6 space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Gestion des Utilisateurs</h1>
            <p className="text-slate-400">Administration des comptes et rôles</p>
          </div>
          {/* Bouton Nouvel utilisateur */}
        </div>

        <UsersTable />
      </div>
    </RoleGate>
  );
}