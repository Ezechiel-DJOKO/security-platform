// src/components/layout/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { 
  LayoutDashboard, 
  ShieldAlert, 
  CheckCircle, 
  FileText, 
  History, 
  Settings,
  Menu,
  X 
} from "lucide-react";

const menuItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Inventaire Vulnérabilités", href: "/dashboard/inventaire", icon: ShieldAlert },
  { label: "Conformité", href: "/dashboard/conformite", icon: CheckCircle },
  { label: "Rapports", href: "/dashboard/rapports", icon: FileText },
  { label: "Audit Trail", href: "/dashboard/audit-trail", icon: History },
  { label: "Paramètres", href: "/dashboard/parametres", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Bouton Menu Mobile */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-3 bg-gray-900 rounded-xl border border-gray-700 text-white"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-40 w-72 bg-gray-950 border-r border-gray-800 
        transform transition-transform duration-300 lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Security</h1>
              <p className="text-xs text-gray-500 -mt-1">Platform</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto h-[calc(100vh-80px)]">
          <div className="space-y-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.href || 
                              (item.href !== "/dashboard" && pathname.startsWith(item.href));
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all
                    ${isActive 
                      ? "bg-blue-600 text-white" 
                      : "text-gray-400 hover:bg-gray-900 hover:text-gray-200"
                    }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="p-4 border-t border-gray-800 text-xs text-gray-500 text-center">
          Ministère du Numérique • v1.0
        </div>
      </div>
    </>
  );
}