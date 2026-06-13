import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { StatutScan } from '@prisma/client';

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

// Si tu as d'autres méthodes (POST, etc.), elles restent inchangées
export async function POST(request: NextRequest) {
  // Ton code POST existant si tu en as un...
  return NextResponse.json({ error: "Méthode non implémentée ici" }, { status: 405 });
}