'use client';
import { useState } from 'react';
import { VulnerabilitiesTable } from '@/components/vulnerabilites/VulnerabilitiesTable';
import { VulnerabilityStats } from '@/components/vulnerabilites/VulnerabilityStats';
import { Button } from '@/components/ui/button';

export default function VulnerabilitesPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refreshData = () => setRefreshTrigger(prev => prev + 1);

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vulnérabilités</h1>
          <p className="text-muted-foreground">
            Liste et suivi des vulnérabilités détectées sur vos actifs
          </p>
        </div>

        <div className="flex gap-3">
          {/* Bouton Aller aux Scans conservé */}
          <Button variant="default" onClick={() => window.location.href = '/scans'}>
            Aller aux Scans
          </Button>
        </div>
      </div>

      <VulnerabilityStats key={`stats-${refreshTrigger}`} />
      <VulnerabilitiesTable key={`table-${refreshTrigger}`} />
    </div>
  );
}