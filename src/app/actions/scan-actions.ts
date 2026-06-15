'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { OutilScan, StatutScan } from '@prisma/client';
import { triggerScanBackground } from '@/lib/scan';

/**
 * ACTION : Lancer un scan (respect du diagramme)
 */
export async function lancerScanAction(idActif: string, outil: OutilScan) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: "Non autorisé : Veuillez vous connecter." };
    }

    const actif = await prisma.actif.findUnique({ where: { id: idActif } });
    if (!actif) {
      return { success: false, error: "Actif introuvable." };
    }

    // 1. Création du scan (EN ATTENTE / PLANIFIE) → Correspond au diagramme
    const scan = await prisma.scan.create({
      data: {
        idActif,
        lancerPar: session.user.id,
        type: "VULNERABILITE",
        outil,
        statut: StatutScan.PLANIFIE,
        cible: actif.adresseIP || actif.hostname || "cible-inconnue",
      },
    });

    console.log(`📋 Scan créé (PLANIFIE) → ID: ${scan.id}`);

    // 2. Lancement en arrière-plan (Démarrer le scan)
    triggerScanBackground(scan.id).catch(err => {
      console.error("[BACKGROUND SCAN ERROR]", err);
    });

    revalidatePath('/scans');
    revalidatePath('/(auditeur)/scans');

    return { 
      success: true, 
      scanId: scan.id,
      message: "Scan lancé avec succès" 
    };

  } catch (error: unknown) {
    console.error("Erreur dans lancerScanAction:", error);
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return { success: false, error: message };
  }
}

/**
 * ACTION : Annuler un scan
 */
export async function annulerScanAction(scanId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: "Non autorisé." };
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
