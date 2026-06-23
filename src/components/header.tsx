'use client';
import { User, Bell, LogOut } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';

export default function Header() {
  const { data: session } = useSession();

  return (
    <header className="flex-shrink-0 h-16 border-b border-slate-700 bg-slate-950 px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-semibold text-white">
          Sécurité Plateforme
        </h2>
      </div>

      <div className="flex items-center gap-4">
        <button className="p-2 hover:bg-slate-800 rounded-xl transition-colors">
          <Bell className="w-5 h-5 text-slate-400" />
        </button>

        <div className="flex items-center gap-3 pl-4 border-l border-slate-700">
          <div className="text-right">
            <p className="text-sm font-medium text-white">
              {session?.user?.name || 'Utilisateur'}
            </p>
            <p className="text-xs text-slate-400 capitalize">
              {session?.user?.role || 'Rôle'}
            </p>
          </div>
          <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/auth/login' })}
            className="p-2 hover:bg-red-950 hover:text-red-400 rounded-xl transition-colors"
          >
            <LogOut className="w-5 h-5 text-slate-400" />
          </button>
        </div>
      </div>
    </header>
  );
}