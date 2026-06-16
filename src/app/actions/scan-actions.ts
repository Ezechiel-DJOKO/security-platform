'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { OutilScan, StatutScan } from '@prisma/client';
import { triggerScanBackground } from '@/lib/scan';

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

    // 1. Création du scan (PLANIFIE) → conforme au diagramme
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

    // 2. Lancement DIRECT en arrière-plan (solution recommandée)
    // Cela évite le problème de 401 avec le fetch
    triggerScanBackground(scan.id).catch(err => {
      console.error(`❌ Erreur background scan ${scan.id}:`, err);
    });

    revalidatePath('/scans');
    revalidatePath('/(dashboard)/scans');
    revalidatePath('/(auditeur)/scans');

    return {
      success: true,
      scanId: scan.id,
      message: "Scan lancé avec succès (Flux 1 activé)"
    };

  } catch (error: unknown) {
    console.error("Erreur dans lancerScanAction:", error);
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return { success: false, error: message };
  }
}