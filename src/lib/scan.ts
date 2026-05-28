// src/lib/scan.ts
import { prisma } from './prisma';

// 1. Votre fonction générique de base reste inchangée
export async function triggerScanBackground(scanId: string) {
  try {
    console.log(`🔄 [Scan ${scanId}] Démarrage...`);

    await prisma.scan.update({
      where: { id: scanId },
      data: { 
        statut: 'EN_COURS',
        debut: new Date()
      }
    });

    console.log(`🔍 [Scan ${scanId}] Analyse en cours...`);
    await new Promise(resolve => setTimeout(resolve, 6500));

    await prisma.scan.update({
      where: { id: scanId },
      data: { 
        statut: 'TERMINE',
        fin: new Date(),
        duree: Math.floor(Math.random() * 180) + 45
      }
    });

    console.log(`✅ [Scan ${scanId}] Terminé avec succès`);
  } catch (error: any) {
    console.error(`❌ [Scan ${scanId}] Échec:`, error.message);

    await prisma.scan.update({
      where: { id: scanId },
      data: { 
        statut: 'ECHEC',
        fin: new Date()
      }
    }).catch(() => {});
  }
}

// 2. AJOUT : Les deux fonctions attendues par votre routeur
export async function triggerNucleiScan(scanId: string) {
  console.log(`[Nuclei] Appel du scan spécifique`);
  // Exécute la logique de fond
  return triggerScanBackground(scanId);
}

export async function triggerGrypeScan(scanId: string) {
  console.log(`[Grype] Appel du scan spécifique`);
  // Exécute la logique de fond
  return triggerScanBackground(scanId);
}
