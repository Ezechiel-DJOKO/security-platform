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

    // ⭐ Vérifier actif non supprimé
    const actif = await prisma.actif.findFirst({
      where: {
        id       : idActif,
        deletedAt: null,
      }
    });

    if (!actif) {
      return {
        success: false,
        error  : "Actif introuvable ou supprimé."
      };
    }

    // Création du scan
    const scan = await prisma.scan.create({
      data: {
        idActif,
        lancerPar : session.user.id,
        type      : "VULNERABILITE",
        outil,
        statut    : StatutScan.PLANIFIE,
        cible     : actif.adresseIP || actif.hostname || "cible-inconnue",
      },
    });

    console.log(`📋 Scan créé (PLANIFIE) → ID: ${scan.id}`);

    // Passage EN_COURS
    await prisma.scan.update({
      where: { id: scan.id },
      data : { statut: StatutScan.EN_COURS, debut: new Date() }
    });

    console.log(`🚀 Scan passé en EN_COURS → ID: ${scan.id}`);

    // Lancement en arrière-plan
    // ⭐ triggerScanBackground crée automatiquement les plans CRITICAL + HIGH
    triggerScanBackground(scan.id).catch(async (err) => {
      console.error(`❌ Erreur background scan ${scan.id}:`, err);

      await prisma.scan.update({
        where: { id: scan.id },
        data : {
          statut: StatutScan.ECHEC,
          erreur: err instanceof Error ? err.message : 'Erreur inconnue',
          fin   : new Date()
        }
      });
    });

    revalidatePath('/scans');
    revalidatePath('/(dashboard)/scans');
    revalidatePath('/(dashboard)/vulnerabilites');
    revalidatePath('/(dashboard)/plans-correction');

    return {
      success : true,
      scanId  : scan.id,
      message : "Scan lancé. Les plans CRITICAL/HIGH seront créés automatiquement."
    };

  } catch (error: unknown) {
    console.error("Erreur dans lancerScanAction:", error);
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return { success: false, error: message };
  }
}