'use client';
import { User, Bell, LogOut } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';

export default function Header() {
  const { data: session } = useSession();

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-950 px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-semibold">Tableau de bord Sécurité</h2>
      </div>

      <div className="flex items-center gap-4">
        <button className="p-2 hover:bg-slate-800 rounded-xl">
          <Bell className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 pl-4 border-l border-slate-800">
          <div className="text-right">
            <p className="text-sm font-medium">{session?.user?.name}</p>
            <p className="text-xs text-slate-500 capitalize">{session?.user?.role}</p>
          </div>
          <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <button 
            onClick={() => signOut({ callbackUrl: '/auth/login' })}
            className="p-2 hover:bg-red-950 hover:text-red-400 rounded-xl transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}