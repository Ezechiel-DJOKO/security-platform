import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const userId = session.user.id;
    const isTechnicien = session.user.role === 'TECHNICIEN';

    // Statistiques globales
    const [
      totalVulnerabilites,
      vulnerabilitesOuvertes,
      totalPlans,
      plansEnCours,
      plansEnRetard,
      totalControles,
      controlesConformes
    ] = await Promise.all([
      prisma.vulnerabilite.count({ where: { deletedAt: null } }),
      
      prisma.vulnerabilite.count({
        where: { deletedAt: null, statut: { in: ['OUVERTE', 'EN_COURS'] } }
      }),

      prisma.planCorrection.count(),

      prisma.planCorrection.count({
        where: { statut: { in: ['A_FAIRE', 'EN_COURS'] } }
      }),

      prisma.planCorrection.count({
        where: {
          statut: { notIn: ['TERMINE', 'VERIFIE', 'ANNULE'] },
          dateEcheance: { lt: new Date() }
        }
      }),

      prisma.controlConformite.count(),
      prisma.controlConformite.count({
        where: { statut: 'CONFORME' }
      })
    ]);

    // Statistiques spécifiques au Technicien
    let mesTachesEnCours = 0;
    let mesVulnerabilites = 0;

    if (isTechnicien) {
      [mesTachesEnCours, mesVulnerabilites] = await Promise.all([
        prisma.planCorrection.count({
          where: {
            assigneA: userId,
            statut: { in: ['A_FAIRE', 'EN_COURS'] }
          }
        }),
        prisma.vulnerabilite.count({
          where: { assigneA: userId }
        })
      ]);
    }

    const tauxConformite = totalControles > 0 
      ? Math.round((controlesConformes / totalControles) * 100) 
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        totalVulnerabilites,
        vulnerabilitesOuvertes,
        tachesEnCours: isTechnicien ? mesTachesEnCours : plansEnCours,
        tachesEnRetard: plansEnRetard,
        mesVulnerabilites,
        tauxConformite,
        totalControles,
        controlesConformes
      }
    });

  } catch (error) {
    console.error('Erreur API Dashboard Stats:', error);
    return NextResponse.json(
      { success: false, error: "Erreur lors de la récupération des statistiques" },
      { status: 500 }
    );
  }
}