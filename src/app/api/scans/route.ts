// src/app/api/scans/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { StatutScan, TypeScan, OutilScan } from '@prisma/client';
import { orchestrateScan } from '@/lib/scanner/scanOrchestrator';

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
        actif: { select: { nom: true, adresseIP: true } },
        utilisateur: { select: { nom: true, prenom: true } }
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: scans });
  } catch (error: any) {
    console.error("Erreur GET scans:", error);
    return NextResponse.json({ error: "Erreur lors de la récupération des scans" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const { idActif, type, outil, cible } = body;

    if (!idActif || !type || !outil || !cible) {
      return NextResponse.json({
        error: "Les champs idActif, type, outil et cible sont obligatoires"
      }, { status: 400 });
    }

    // 1. Création du scan
    const scan = await prisma.scan.create({
      data: {
        idActif,
        lancerPar: session.user.id,
        type: type as TypeScan,
        outil: outil as OutilScan,
        statut: StatutScan.PLANIFIE,
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
        utilisateur: { select: { nom: true, prenom: true, email: true } }
      }
    });

    // 2. Lancement asynchrone du scan
    setTimeout(() => {
      orchestrateScan(scan.id)
        .then(async (result) => {
          // ✅ MISE À JOUR DU DERNIER SCAN SUR L'ACTIF
          if (result?.success) {
            await prisma.actif.update({
              where: { id: idActif },
              data: { 
                dernierScan: new Date() 
              }
            });
            console.log(`✅ DernierScan mis à jour pour l'actif ${idActif}`);
          }
        })
        .catch((error) => {
          console.error(`Erreur orchestration scan ${scan.id}:`, error);
        });
    }, 800);

    return NextResponse.json({
      success: true,
      message: "Scan lancé avec succès. Les vulnérabilités seront disponibles une fois le scan terminé.",
      data: scan
    }, { status: 201 });

  } catch (error: any) {
    console.error("Erreur POST scans:", error);
    return NextResponse.json({ error: "Erreur lors de la création du scan" }, { status: 500 });
  }
}