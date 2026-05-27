// src/lib/scan.ts
import { prisma } from './prisma';

export async function triggerScanBackground(scanId: string) {
  try {
    // Mise à jour du statut en cours
    await prisma.scan.update({
      where: { id: scanId },
      data: { 
        statut: 'EN_COURS',
        debut: new Date()
      }
    });

    // Simulation de traitement (à remplacer plus tard par un vrai scanner)
    console.log(`🔍 Scan ${scanId} en cours...`);
    await new Promise(resolve => setTimeout(resolve, 6500)); // Simulation 6.5s

    // Finalisation du scan
    await prisma.scan.update({
      where: { id: scanId },
      data: { 
        statut: 'TERMINE',
        fin: new Date(),
        duree: Math.floor(Math.random() * 180) + 45 // durée aléatoire en secondes
      }
    });

    console.log(`✅ Scan ${scanId} terminé avec succès`);
  } catch (error) {
    console.error(`❌ Erreur lors du scan ${scanId}:`, error);
    
    await prisma.scan.update({
      where: { id: scanId },
      data: { statut: 'ECHEC' }
    });
  }
}