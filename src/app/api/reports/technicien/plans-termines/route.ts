import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const plansTermines = await prisma.planCorrection.findMany({
      where: {
        assigneA: session.user.id,
        statut: 'TERMINE',
      },
      include: {
        vulnerabilite: {
          select: {
            titre: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Transformation pour correspondre au type Rapport du frontend
    const rapports = plansTermines.map((plan) => ({
      id: plan.id,
      titre: plan.vulnerabilite.titre,
      concerneVulnerabilite: plan.vulnerabilite.titre,
      genereLe: plan.updatedAt.toISOString(),
      type: 'correction',
    }));

    return NextResponse.json(rapports);
  } catch (error) {
    console.error("Erreur lors du chargement des plans terminés:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement des rapports" }, 
      { status: 500 }
    );
  }
}