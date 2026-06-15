'use server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { OutilScan, StatutScan } from '@prisma/client';

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

    // 1. Création du scan (EN ATTENTE) → Diagramme
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

    // 2. Lancement via le nouvel endpoint (recommandé)
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/scans/${scan.id}/launch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Erreur lors du lancement: ${response.status}`);
    }

    revalidatePath('/scans');
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