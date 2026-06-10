'use client';

import { useState } from 'react';
import Link from 'next/link';

import { VulnerabilitiesTable } from '@/components/vulnerabilites/VulnerabilitiesTable';
import { VulnerabilityStats } from '@/components/vulnerabilites/VulnerabilityStats';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';
import { ScanLaunchModal } from '@/components/vulnerabilites/ScanLaunchModal';

export default function VulnerabilitesPage() {
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Vulnérabilités</h1>
          <p className="text-muted-foreground">
            Gestion et suivi des vulnérabilités détectées
          </p>
        </div>

        <div className="flex gap-3">
          {/* Bouton redirigeant vers la page Scans (recommandé) */}
          <Button variant="outline" onClick={() => window.location.href = '/scans'}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Aller aux Scans
          </Button>

          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle Vulnérabilité
          </Button>
        </div>
      </div>

      <VulnerabilityStats />
      <VulnerabilitiesTable />

      {/* Modal de lancement de scan */}
      <ScanLaunchModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
      />
    </div>
  );
}