'use client';
import { useState, useEffect } from 'react';
import { VulnerabilitiesTable } from '@/components/vulnerabilites/VulnerabilitiesTable';
import { VulnerabilityStats } from '@/components/vulnerabilites/VulnerabilityStats';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';

export default function VulnerabilitesPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refreshData = () => setRefreshTrigger(prev => prev + 1);

  // Auto-refresh toutes les 6 secondes
  useEffect(() => {
    const interval = setInterval(refreshData, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Vulnérabilités</h1>
          <p className="text-muted-foreground">Gestion et suivi des vulnérabilités détectées</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={refreshData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualiser
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/scans'}>
            Aller aux Scans
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle Vulnérabilité
          </Button>
        </div>
      </div>

      {/* Clés différentes pour chaque composant */}
      <VulnerabilityStats key={`stats-${refreshTrigger}`} />
      <VulnerabilitiesTable key={`table-${refreshTrigger}`} />
    </div>
  );
}
