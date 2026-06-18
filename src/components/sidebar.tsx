'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShieldCheck,
  Package,
  FileText,
  ScanLine,
  Bug,
  CheckSquare,
  Users
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/inventaire', label: 'Inventaire', icon: Package },
  { href: '/scans', label: 'Scans', icon: ScanLine },
  { href: '/vulnerabilites', label: 'Vulnérabilités', icon: Bug },
  { href: '/plans-correction', label: 'Plans de correction', icon: CheckSquare },
  { href: '/rapports', label: 'Rapports', icon: FileText },
  { href: '/conformite', label: 'Conformité', icon: ShieldCheck },
  { href: '/utilisateurs', label: 'Utilisateurs', icon: Users }, // Ajoute l'import { Users } from 'lucide-react'
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-72 bg-slate-950 border-r border-slate-800 flex flex-col h-screen">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-2xl font-bold text-blue-500">SecuPlatform</h1>
        <p className="text-xs text-slate-500 mt-1">Ministère du Numérique</p>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 mt-auto">
        <div className="bg-slate-900 rounded-2xl p-4 text-xs">
          <p className="text-emerald-400 font-medium">Système Sécurisé</p>
          <p className="text-slate-500 mt-1">Dernier scan : il y a 2h</p>
        </div>
      </div>
    </div>
  );
}