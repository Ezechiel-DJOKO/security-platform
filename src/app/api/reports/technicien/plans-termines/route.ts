import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const plans = await prisma.planCorrection.findMany({
      where: {
        assigneA: session.user.id,
        statut: 'TERMINE',
      },
      include: {
        vulnerabilite: {
          select: {
            titre: true,
            cveId: true,
            severite: true,
          },
        },
      },
      orderBy: { dateResolution: 'desc' },
    });

    // On formate pour correspondre au type `Rapport` du front
    const rapports = plans.map((p) => ({
      id: p.id,
      titre: p.vulnerabilite.titre,
      genereLe: (p.dateResolution ?? p.updatedAt).toISOString(),
      concerneVulnerabilite: p.vulnerabilite.cveId
        ? `${p.vulnerabilite.cveId} • ${p.vulnerabilite.severite}`
        : p.vulnerabilite.severite,
    }));

    return NextResponse.json(rapports);
  } catch (error) {
    console.error('Erreur récupération plans terminés:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des rapports' },
      { status: 500 }
    );
  }
}