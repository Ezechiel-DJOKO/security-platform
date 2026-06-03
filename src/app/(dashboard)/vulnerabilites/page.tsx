import { VulnerabilitiesTable } from '@/components/vulnerabilites/VulnerabilitiesTable';
import { VulnerabilityStats } from '@/components/vulnerabilites/VulnerabilityStats';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';

export default function VulnerabilitesPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Vulnérabilités</h1>
          <p className="text-muted-foreground">Gestion et suivi des vulnérabilités détectées</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Lancer un Scan
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle Vulnérabilité
          </Button>
        </div>
      </div>

      <VulnerabilityStats />
      <VulnerabilitiesTable />
    </div>
  );
}