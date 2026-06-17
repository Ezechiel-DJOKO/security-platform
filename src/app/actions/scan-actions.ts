'use server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { OutilScan, StatutScan } from '@prisma/client';
import { triggerScanBackground } from '@/lib/scan'; // ou le chemin correct

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

    // 1. Création du scan (conforme au diagramme)
    const scan = await prisma.scan.create({
      data: {
        idActif,
        lancerPar: session.user.id,
        type: "VULNERABILITE",
        outil,
        statut: StatutScan.PLANIFIE,   // ou StatutScan.EN_ATTENTE si tu préfères
        cible: actif.adresseIP || actif.hostname || "cible-inconnue",
      },
    });

    console.log(`📋 Scan créé (PLANIFIE) → ID: ${scan.id}`);

    // 2. Mise à jour immédiate du statut → "EN_COURS" (important pour le diagramme)
    await prisma.scan.update({
      where: { id: scan.id },
      data: { statut: StatutScan.EN_COURS, debut: new Date() }
    });

    console.log(`🚀 Scan passé en EN_COURS → ID: ${scan.id}`);

    // 3. Lancement en arrière-plan
    triggerScanBackground(scan.id).catch(async (err) => {
      console.error(`❌ Erreur background scan ${scan.id}:`, err);
      
      // Mise à jour en erreur en cas d'échec
      await prisma.scan.update({
        where: { id: scan.id },
        data: { 
          statut: StatutScan.ECHEC,
          erreur: err instanceof Error ? err.message : 'Erreur inconnue',
          fin: new Date()
        }
      });
    });

    // Revalidation du cache
    revalidatePath('/scans');
    revalidatePath('/(dashboard)/scans');
    revalidatePath('/(dashboard)/vulnerabilites');
    revalidatePath('/(dashboard)/plans-correction');

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