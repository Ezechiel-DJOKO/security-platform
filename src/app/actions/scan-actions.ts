'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/lib/auth';
import { triggerScanBackground } from '@/lib/scan';
import { revalidatePath } from 'next/cache';
import { OutilScan, StatutScan } from '@prisma/client';

/**
 * ACTION 1 : Déclencher un scan manuellement
 */
export async function lancerScanAction(idActif: string, outil: OutilScan) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Non autorisé : Veuillez vous connecter.");
  }

  try {
    const actif = await prisma.actif.findUnique({ where: { id: idActif } });
    if (!actif) throw new Error("Actif introuvable.");

    const scan = await prisma.scan.create({
      data: {
        idActif,
        lancerPar: session.user.id,
        type: "VULNERABILITE",
        outil,
        statut: StatutScan.PLANIFIE,
      },
    });

    triggerScanBackground(scan.id);

    revalidatePath('/scans');
    
    return { success: true, scanId: scan.id };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue lors du lancement du scan';
    return { success: false, error: message };
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
    const scan = await prisma.scan.findUnique({ where: { id: scanId } });
    if (!scan) throw new Error("Scan introuvable.");

    if (scan.statut === StatutScan.TERMINE || scan.statut === StatutScan.ECHEC) {
      throw new Error("Impossible d'annuler un scan déjà terminé.");
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
    const message = error instanceof Error ? error.message : 'Erreur inconnue lors de l\'annulation';
    return { success: false, error: message };
  }
}