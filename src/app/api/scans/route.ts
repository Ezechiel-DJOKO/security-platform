// src/app/api/scans/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { StatutScan, TypeScan, OutilScan } from '@prisma/client';
import { orchestrateScan } from '@/lib/scanner/scanOrchestrator'; // ← Ajout important

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const statut = searchParams.get('statut') as StatutScan | null;
    const actifId = searchParams.get('actifId');

    const where: any = {};
    if (statut) where.statut = statut;
    if (actifId) where.idActif = actifId;

    const scans = await prisma.scan.findMany({
      where,
      include: {
        actif: {
          select: { nom: true, adresseIP: true }
        },
        utilisateur: {
          select: { nom: true, prenom: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: scans
    });
  } catch (error: any) {
    console.error("Erreur GET scans:", error);
    return NextResponse.json({
      error: "Erreur lors de la récupération des scans"
    }, { status: 500 });
  }
}

/**
 * POST /api/scans
 * Crée un nouveau scan en statut PLANIFIE (EN ATTENTE)
 * Puis lance l'orchestration complète selon le diagramme de séquence Flux 1
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const { idActif, type, outil, cible } = body;

    // Validation minimale
    if (!idActif || !type || !outil || !cible) {
      return NextResponse.json({
        error: "Les champs idActif, type, outil et cible sont obligatoires"
      }, { status: 400 });
    }

    // 1. Enregistrer le scan en statut PLANIFIE (EN ATTENTE) → Correspond au diagramme
    const scan = await prisma.scan.create({
      data: {
        idActif,
        lancerPar: session.user.id,
        type: type as TypeScan,
        outil: outil as OutilScan,
        statut: StatutScan.PLANIFIE,        // EN ATTENTE selon diagramme
        cible,
        debut: null,
        fin: null,
        resultatBrut: null as any,
        metadata: {
          createdBy: session.user.email,
          source: "interface_utilisateur"
        }
      },
      include: {
        actif: true,
        utilisateur: {
          select: { nom: true, prenom: true, email: true }
        }
      }
    });

    // 2. Lancer l'orchestration ASYNCHRONE (ne bloque pas la réponse utilisateur)
    // Cela correspond à tout le reste du diagramme : Démarrer scan → OpenVAS → Post-processing → Alertes
    setTimeout(() => {
      orchestrateScan(scan.id).catch((error) => {
        console.error(`Erreur orchestration scan ${scan.id}:`, error);
      });
    }, 800); // Petit délai pour laisser le temps à la réponse HTTP

    return NextResponse.json({
      success: true,
      message: "Scan enregistré avec succès (EN ATTENTE) → Lancement du scan OpenVAS en cours...",
      data: scan
    }, { status: 201 });

  } catch (error: any) {
    console.error("Erreur POST scans:", error);
    return NextResponse.json({
      error: "Erreur lors de la création du scan"
    }, { status: 500 });
  }
}