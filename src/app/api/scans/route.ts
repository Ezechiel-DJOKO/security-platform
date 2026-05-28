// src/app/api/scans/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { triggerScanBackground, triggerNucleiScan, triggerGrypeScan } from '@/lib/scan';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const { idActif, type, outil, target, imageName } = await req.json();

    if (!outil) {
      return NextResponse.json({ error: "Outil requis (NUCLEI, GRYPE, OPENVAS...)" }, { status: 400 });
    }

    // Préparation des données de scan
    let scanData: any = {
      lancerPar: session.user.id,
      type: type || "VULNERABILITE",
      outil,
      statut: "PLANIFIE",
    };

    // Vérification de l'actif si fourni
    if (idActif) {
      const actif = await prisma.actif.findUnique({ where: { id: idActif } });
      if (!actif) {
        return NextResponse.json({ error: "Actif non trouvé" }, { status: 404 });
      }
      scanData.idActif = idActif;
    }

    // Création du scan en BDD
    const scan = await prisma.scan.create({
      data: scanData,
      include: { actif: true }
    });

    // Lancement en arrière-plan selon l'outil (un seul argument requis : scan.id)
    if (outil === "NUCLEI") {
      triggerNucleiScan(scan.id); 
    } else if (outil === "GRYPE") {
      triggerGrypeScan(scan.id); // 💡 Retrait de imageName car la fonction n'attend que l'ID
    } else {
      triggerScanBackground(scan.id); 
    }

    return NextResponse.json({
      message: `Scan ${outil} lancé avec succès`,
      scanId: scan.id,
      scan
    }, { status: 201 });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Votre fonction GET existante
export async function GET(req: NextRequest) {
  try {
    const scans = await prisma.scan.findMany({
      include: { actif: true }
    });
    return NextResponse.json(scans);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
