'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { OutilScan, StatutScan } from '@prisma/client';
import { triggerScanBackground } from '@/lib/scan';   // ← Import correct

/**
 * ACTION 1 : Déclencher un scan manuellement
 */
export async function lancerScanAction(idActif: string, outil: OutilScan) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: "Non autorisé : Veuillez vous connecter." };
    }

    const actif = await prisma.actif.findUnique({ 
      where: { id: idActif } 
    });
    if (!actif) {
      return { success: false, error: "Actif introuvable." };
    }

    const scan = await prisma.scan.create({
      data: {
        idActif,
        lancerPar: session.user.id,
        type: "VULNERABILITE",
        outil,
        statut: StatutScan.PLANIFIE,
      },
    });

    // Appel non bloquant du scan en arrière-plan (comme dans le diagramme de séquence)
    triggerScanBackground(scan.id).catch(err => {
      console.error("[BACKGROUND ERROR]", err);
    });

    revalidatePath('/scans');
    return { success: true, scanId: scan.id };

  } catch (error: unknown) {
    console.error("Erreur dans lancerScanAction:", error);
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return { success: false, error: message };
  }
}

/**
 * ACTION 2 : Annuler un scan en cours ou planifié
 */
export async function annulerScanAction(scanId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: "Non autorisé." };
    }

    const scan = await prisma.scan.findUnique({ where: { id: scanId } });
    if (!scan) {
      return { success: false, error: "Scan introuvable." };
    }

    if (scan.statut === StatutScan.TERMINE || scan.statut === StatutScan.ECHEC) {
      return { success: false, error: "Impossible d'annuler un scan déjà terminé." };
    }

    const scanMisAJour = await prisma.scan.update({
      where: { id: scanId },
      data: {
        statut: StatutScan.ECHEC,
        fin: new Date(),
        metadata: { statusMessage: "Annulé manuellement par l'utilisateur." }
      },
    });

    revalidatePath('/scans');
    return { success: true, scanId: scanMisAJour.id };

  } catch (error: unknown) {
    console.error("Erreur dans annulerScanAction:", error);
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return { success: false, error: message };
  }
}