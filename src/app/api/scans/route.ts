// src/app/api/scans/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { triggerScanBackground } from '@/lib/scan';   // ← Import ajouté ici

// ====================== POST : Déclencher un scan ======================
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const { idActif, type, outil } = await req.json();

    if (!idActif || !type || !outil) {
      return NextResponse.json(
        { error: "idActif, type et outil sont obligatoires" }, 
        { status: 400 }
      );
    }

    const actifExiste = await prisma.actif.findUnique({
      where: { id: idActif }
    });

    if (!actifExiste) {
      return NextResponse.json({ error: "Actif non trouvé" }, { status: 404 });
    }

    const scan = await prisma.scan.create({
      data: {
        idActif,
        lancerPar: session.user.id,
        type,
        outil,
        statut: 'PLANIFIE',
      },
      include: {
        actif: true,
        utilisateur: {
          select: { nom: true, prenom: true, email: true }
        }
      }
    });

    // Lancement du scan en arrière-plan
    triggerScanBackground(scan.id);   // Appel correct

    return NextResponse.json({
      message: "Scan lancé avec succès",
      scanId: scan.id,
      scan
    }, { status: 201 });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ 
      error: "Erreur lors du lancement du scan",
      details: error.message 
    }, { status: 500 });
  }
}

// ====================== GET : Historique des scans ======================
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const statut = searchParams.get('statut');
  const type = searchParams.get('type');
  const idActif = searchParams.get('idActif');

  const where: any = {};

  if (statut) where.statut = statut;
  if (type) where.type = type;
  if (idActif) where.idActif = idActif;

  const [scans, total] = await Promise.all([
    prisma.scan.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        actif: {
          select: { nom: true, type: true, criticite: true }
        },
        utilisateur: {
          select: { nom: true, prenom: true }
        },
        _count: {
          select: { vulnerabilites: true }
        }
      }
    }),
    prisma.scan.count({ where })
  ]);

  return NextResponse.json({
    scans,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
}