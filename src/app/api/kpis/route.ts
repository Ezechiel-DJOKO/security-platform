// src/app/api/kpis/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { subMonths, startOfMonth } from 'date-fns';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Non authentifié" },
        { status: 401 }
      );
    }

    // === Statistiques principales (optimisées avec Promise.all) ===
    const [
      totalVulnerabilites,
      vulnsCritiques,
      vulnsCorrigees,
      cvssDistributionRaw,
      lastScan
    ] = await Promise.all([
      // Total vulnérabilités actives
      prisma.vulnerabilite.count({
        where: { deletedAt: null }
      }),

      // Vulnérabilités critiques (HIGH + CRITICAL)
      prisma.vulnerabilite.count({
        where: {
          deletedAt: null,
          severite: { in: ['HIGH', 'CRITICAL'] }
        }
      }),

      // Vulnérabilités corrigées (derniers 60 jours par exemple)
      prisma.vulnerabilite.count({
        where: {
          deletedAt: null,
          statut: { in: ['CORRIGEE', 'VERIFIEE', 'RISQUE_ACCEPTE'] },
          updatedAt: { gte: subMonths(new Date(), 2) }
        }
      }),

      // Distribution par sévérité (dynamique)
      prisma.vulnerabilite.groupBy({
        by: ['severite'],
        where: { deletedAt: null },
        _count: { id: true }
      }),

      // Dernier scan pour info
      prisma.scan?.findFirst?.({
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true }
      }) ?? null
    ]);

    // Calcul du pourcentage
    const pourcentageCritiquesResolus = vulnsCritiques > 0
      ? Math.round((vulnsCorrigees / vulnsCritiques) * 100)
      : 0;

    // === Distribution CVSS dynamique ===
    const severityColors: Record<string, string> = {
      CRITICAL: '#ef4444',
      HIGH: '#f97316',
      MEDIUM: '#eab308',
      LOW: '#22c55e',
    };

    const cvssDistribution = cvssDistributionRaw
      .filter(item => item.severite) // sécurité
      .map(item => ({
        name: item.severite === 'CRITICAL' ? 'Critique' :
              item.severite === 'HIGH' ? 'Élevé' :
              item.severite === 'MEDIUM' ? 'Moyen' : 'Bas',
        value: item._count.id,
        color: severityColors[item.severite] || '#64748b'
      }))
      .sort((a, b) => b.value - a.value); // tri descendant

    // === Tendances temporelles (6 derniers mois) ===
    const temporalTrends = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthName = date.toLocaleDateString('fr-FR', { month: 'short' });

      const vulnsThisMonth = await prisma.vulnerabilite.count({
        where: {
          deletedAt: null,
          createdAt: {
            gte: startOfMonth(date),
            lt: startOfMonth(subMonths(date, -1))
          }
        }
      });

      temporalTrends.push({
        mois: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        vulns: vulnsThisMonth,
        scoreMoyen: Number((6.8 + Math.random() * 1.4).toFixed(1)) // À remplacer par vrai calcul CVSS moyen
      });
    }

    // Score ISO 27001 (à remplacer par vraie logique plus tard)
    const scoreISO27001 = Math.floor(68 + Math.random() * 22);

    const kpis = {
      totalVulnerabilites,
      vulnsCritiques,
      vulnsCorrigees,
      pourcentageCritiquesResolus,
      delaiMoyenCorrection: 14,           // TODO: Calcul réel via dates de création/résolution
      scoreISO27001,
      lastUpdated: new Date(),
      cvssDistribution,
      temporalTrends,
    };

    return NextResponse.json({
      success: true,
      data: kpis
    });

  } catch (error) {
    console.error('API KPIs Error:', error);
    return NextResponse.json({
      success: false,
      error: "Erreur interne lors du calcul des KPIs"
    }, { status: 500 });
  }
}