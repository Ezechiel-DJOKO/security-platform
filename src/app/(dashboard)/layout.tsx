import { ReactNode } from 'react';
import Sidebar from '@/components/sidebar';
import Header from '@/components/header';
import { RoleGate } from '@/components/RoleGate';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-slate-950 text-slate-200">
      {/* Sidebar */}
      <Sidebar />

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-auto bg-slate-900 p-6">
          <RoleGate allowedRoles={['ADMIN', 'SUPERVISEUR', 'AUDITEUR']}>
            {children}
          </RoleGate>
        </main>
      </div>
    </div>
  );
}