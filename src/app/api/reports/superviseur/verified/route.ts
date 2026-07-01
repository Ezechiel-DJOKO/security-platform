import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const vulnerabilites = await prisma.vulnerabilite.findMany({
      where: {
        deletedAt: null,
        statut: 'VERIFIEE',
      },
      include: {
        actif: { select: { nom: true } },
        assigne: { select: { prenom: true, nom: true } },
      },
      orderBy: { dateCorrection: 'desc' },
    });

    const rapports = vulnerabilites.map(v => ({
      id: v.id,
      titre: v.titre,
      genereLe: v.dateCorrection || v.updatedAt,
      concerne: v.actif?.nom ? `Actif : ${v.actif.nom}` : undefined,
      corrigePar: v.assigne ? `${v.assigne.prenom} ${v.assigne.nom}` : undefined,
      verifiePar: session.user.name || 'Superviseur',
    }));

    return NextResponse.json(rapports);

  } catch (error) {
    console.error(error);
    return NextResponse.json([], { status: 500 });
  }
}