import Sidebar from '@/components/sidebar';
import Header from '@/components/header';
import { RoleGate } from '@/components/RoleGate';
import AlertListener from '@/components/AlertListener';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header sticky */}
        <div className="sticky top-0 z-10">
          <Header />
        </div>

        {/* Main avec scroll */}
        <main className="flex-1 overflow-auto bg-slate-900 p-6">
          <RoleGate allowedRoles={['ADMIN', 'SUPERVISEUR', 'AUDITEUR', 'TECHNICIEN']}>
            {children}
          </RoleGate>
        </main>

        <AlertListener />
      </div>
    </div>
  );
}