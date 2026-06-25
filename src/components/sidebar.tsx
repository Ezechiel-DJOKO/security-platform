'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ShieldCheck,
  Package,
  FileText,
  ScanLine,
  Bug,
  CheckSquare,
  Users,
  UserCheck,
  Menu,
  X
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

// Configuration des menus par rôle
const menuConfig = {
  ADMIN: [
    { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { href: '/inventaire', label: 'Inventaire', icon: Package },
    { href: '/scans', label: 'Scans', icon: ScanLine },
    { href: '/vulnerabilites', label: 'Vulnérabilités', icon: Bug },
    { href: '/plans-correction', label: 'Plans de correction', icon: CheckSquare },
    { href: '/rapports', label: 'Rapports', icon: FileText },
    { href: '/conformite', label: 'Conformité', icon: ShieldCheck },
    { href: '/utilisateurs', label: 'Utilisateurs', icon: Users },
  ],
  SUPERVISEUR: [
    { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { href: '/vulnerabilites', label: 'Vulnérabilités', icon: Bug },
    { href: '/plans-correction', label: 'Plans de correction', icon: CheckSquare },
    { href: '/rapports', label: 'Rapports', icon: FileText },
    { href: '/conformite', label: 'Conformité', icon: ShieldCheck },
  ],
  AUDITEUR: [
    { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { href: '/scans', label: 'Scans', icon: ScanLine },
    { href: '/vulnerabilites', label: 'Vulnérabilités', icon: Bug },
    { href: '/plans-correction', label: 'Plans de correction', icon: CheckSquare },
    { href: '/rapports', label: 'Rapports', icon: FileText },
    { href: '/conformite', label: 'Conformité', icon: ShieldCheck },
  ],
  TECHNICIEN: [
    { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { href: '/vulnerabilites', label: 'Vulnérabilités Assignées', icon: Bug },
    { href: '/mes-taches', label: 'Mes Tâches', icon: UserCheck },
    { href: '/plans-correction', label: 'Plans de correction', icon: CheckSquare },
    { href: '/rapports', label: 'Rapports', icon: FileText },
  ],
} as const;

export default function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [dernierScan, setDernierScan] = useState<string | null>(null);

  const userRole = (session?.user?.role as keyof typeof menuConfig) || 'AUDITEUR';
  const navItems = menuConfig[userRole];

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/');
  };

  // Récupération du dernier scan global
  useEffect(() => {
    const fetchLastScan = async () => {
      try {
        const res = await fetch('/api/actifs');
        const result = await res.json();

        if (result.success && result.data?.length > 0) {
          const mostRecent = result.data
            .filter((a: any) => a.dernierScan)
            .sort((a: any, b: any) => 
              new Date(b.dernierScan).getTime() - new Date(a.dernierScan).getTime()
            )[0];

          if (mostRecent?.dernierScan) {
            setDernierScan(mostRecent.dernierScan);
          } else {
            setDernierScan(null);
          }
        }
      } catch (error) {
        console.error("Erreur récupération dernier scan global:", error);
      }
    };

    fetchLastScan();
    const interval = setInterval(fetchLastScan, 120000); // Toutes les 2 minutes

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Bouton mobile */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-300 hover:bg-slate-800 transition-colors"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <div className={`fixed lg:static inset-y-0 left-0 z-40 w-72 bg-slate-950 border-r border-slate-800 flex flex-col h-screen transition-transform duration-300 lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-2xl font-bold text-blue-500">SecuPlatform</h1>
          <p className="text-xs text-slate-500 mt-1">Ministère du Numérique</p>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-all ${
                  active ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* === STATUS EN BAS À GAUCHE === */}
        <div className="p-4 border-t border-slate-800 mt-auto">
          <div className="bg-slate-900 rounded-2xl p-4 text-xs">
            <p className="text-emerald-400 font-medium">Système Sécurisé</p>
            
            {dernierScan ? (
              <p className="text-slate-400 mt-1">
                Dernier scan : il y a{' '}
                {formatDistanceToNow(new Date(dernierScan), { 
                  locale: fr, 
                  addSuffix: true 
                })}
              </p>
            ) : (
              <p className="text-amber-500 mt-1">Aucun scan effectué</p>
            )}
          </div>

          <div className="mt-4 px-2">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center font-semibold text-white">
                {session?.user?.name?.[0] || session?.user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <p className="text-white font-medium truncate max-w-[140px]">
                  {session?.user?.name || session?.user?.email?.split('@')[0] || 'Utilisateur'}
                </p>
                <p className="text-[10px] uppercase text-emerald-500 font-mono">
                  {userRole}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}