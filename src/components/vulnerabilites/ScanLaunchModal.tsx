'use client';

import { useState } from 'react';
import { Play, Target, Shield, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ScanLaunchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ScanLaunchModal({ isOpen, onClose }: ScanLaunchModalProps) {
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [scanType, setScanType] = useState<'nuclei' | 'openvas' | 'full'>('nuclei');
  const [isLaunching, setIsLaunching] = useState(false);

  if (!isOpen) return null;

  const handleLaunchScan = async () => {
    if (!selectedAssetId) {
      toast.error("Veuillez sélectionner un actif");
      return;
    }

    setIsLaunching(true);

    try {
      const res = await fetch('/api/scans/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: selectedAssetId,
          type: scanType,
          tool: scanType === 'nuclei' ? 'nuclei' : 'openvas',
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Erreur lors du lancement');

      toast.success('Scan lancé avec succès !');
      onClose();
      setTimeout(() => window.location.reload(), 1200);
    } catch (error: any) {
      toast.error(error.message || 'Échec du lancement du scan');
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-card border border-border rounded-xl w-full max-w-lg mx-4 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Target className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold">Lancer un nouveau scan</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Actif */}
          <div>
            <label className="text-sm font-medium mb-2 block flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Actif à scanner
            </label>
            <select
              value={selectedAssetId}
              onChange={(e) => setSelectedAssetId(e.target.value)}
              className="w-full p-3 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Sélectionner un actif...</option>
              <option value="1">Serveur Web Principal - 192.168.10.10</option>
              <option value="2">Base de Données - 192.168.10.20</option>
              <option value="3">Serveur Applicatif - 192.168.10.30</option>
            </select>
          </div>

          {/* Type de Scan */}
          <div>
            <label className="text-sm font-medium mb-2 block">Type de Scan</label>
            <select
              value={scanType}
              onChange={(e) => setScanType(e.target.value as 'nuclei' | 'openvas' | 'full')}
              className="w-full p-3 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="nuclei">⚡ Nuclei (Vulnérabilités Web rapides)</option>
              <option value="openvas">🛡️ OpenVAS (Scan réseau complet)</option>
              <option value="full">🔍 Scan Complet (Nuclei + OpenVAS)</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t bg-muted/50 rounded-b-xl">
          <Button variant="outline" onClick={onClose} disabled={isLaunching}>
            Annuler
          </Button>
          <Button onClick={handleLaunchScan} disabled={isLaunching || !selectedAssetId}>
            <Play className="mr-2 h-4 w-4" />
            {isLaunching ? 'Lancement en cours...' : 'Lancer le Scan'}
          </Button>
        </div>
      </div>
    </div>
  );
}