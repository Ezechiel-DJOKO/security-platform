'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { triggerScanBackground } from '@/lib/scan';
import { revalidatePath } from 'next/cache';
import { OutilScan, StatutScan } from '@prisma/client';

/**
 * ACTION 1 : Déclencher un scan manuellement
 */
export async function lancerScanAction(idActif: string, outil: OutilScan) {
  // 1. Protection de l'Action (Authentification)
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Non autorisé : Veuillez vous connecter.");
  }

  try {
    // 2. Vérifier si l'actif existe
    const actif = await prisma.actif.findUnique({ where: { id: idActif } });
    if (!actif) throw new Error("Actif introuvable.");

    // 3. Créer l'enregistrement de scan à l'état PLANIFIE
    const scan = await prisma.scan.create({
      data: {
        idActif,
        lancerPar: session.user.id,
        type: "VULNERABILITE",
        outil,
        statut: StatutScan.PLANIFIE,
      },
    });

    // 4. Déclencher le processus en tâche de fond (non-bloquant)
    // Pas de 'await' ici pour libérer immédiatement l'interface graphique
    triggerScanBackground(scan.id);

    // 5. Rafraîchir instantanément le cache de la page des scans
    revalidatePath('/scans');
    
    return { success: true, scanId: scan.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * ACTION 2 : Annuler un scan en cours ou planifié
 */
export async function annulerScanAction(scanId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Non autorisé.");
  }

  try {
    // 1. Récupérer le scan pour vérifier son statut actuel
    const scan = await prisma.scan.findUnique({ where: { id: scanId } });
    if (!scan) throw new Error("Scan introuvable.");

    // Sécurité : Empêcher d'annuler un scan déjà finalisé
    if (scan.statut === StatutScan.TERMINE || scan.statut === StatutScan.ECHEC) {
      throw new Error("Impossible d'annuler un scan déjà terminé.");
    }

    // 2. Mettre à jour le statut en base de données
    const scanMisAJour = await prisma.scan.update({
      where: { id: scanId },
      data: {
        statut: StatutScan.ECHEC, // Ou créer une valeur 'ANNULE' dans votre enum StatutScan
        fin: new Date(),
        metadata: { statusMessage: "Annulé manuellement par l'utilisateur." }
      },
    });

    // 3. Rafraîchir l'interface
    revalidatePath('/scans');

    return { success: true, scanId: scanMisAJour.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
