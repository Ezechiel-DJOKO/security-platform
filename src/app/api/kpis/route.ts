// src/app/api/kpis/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { calculateGapAnalysis } from '@/lib/conformite/gapAnalysisService';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Non authentifié" }, { status: 401 });
    }

    const userRole = session.user.role;

    // === Calcul synchronisé de la conformité ===
    const gapAnalysis = await calculateGapAnalysis();

    // === Statistiques principales ===
    const [
      totalVulnerabilites,
      vulnsCritiques,
      vulnsCorrigees,
      cvssDistributionRaw,
      lastScan,
    ] = await Promise.all([
      prisma.vulnerabilite.count({ where: { deletedAt: null } }),
      prisma.vulnerabilite.count({
        where: { deletedAt: null, severite: { in: ['HIGH', 'CRITICAL'] } }
      }),
      prisma.vulnerabilite.count({
        where: {
          deletedAt: null,
          statut: { in: ['CORRIGEE', 'VERIFIEE', 'RISQUE_ACCEPTE'] },
          updatedAt: { gte: subMonths(new Date(), 2) }
        }
      }),
      prisma.vulnerabilite.groupBy({
        by: ['severite'],
        where: { deletedAt: null },
        _count: { id: true }
      }),
      prisma.scan.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true, type: true }
      }),
    ]);

    const pourcentageCritiquesResolus = vulnsCritiques > 0
      ? Math.round((vulnsCorrigees / vulnsCritiques) * 100)
      : 0;

    // Distribution CVSS
    const severityColors: Record<string, string> = {
      CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#eab308', LOW: '#22c55e'
    };

    const cvssDistribution = cvssDistributionRaw
      .filter(item => item.severite)
      .map(item => ({
        name: item.severite === 'CRITICAL' ? 'Critique' :
              item.severite === 'HIGH' ? 'Élevé' :
              item.severite === 'MEDIUM' ? 'Moyen' : 'Bas',
        value: item._count.id,
        color: severityColors[item.severite] || '#64748b'
      }))
      .sort((a, b) => b.value - a.value);

    // Tendances temporelles
    const temporalTrends = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);

      const vulnsThisMonth = await prisma.vulnerabilite.count({
        where: {
          deletedAt: null,
          createdAt: { gte: start, lte: end }
        }
      });

      temporalTrends.push({
        mois: date.toLocaleDateString('fr-FR', { month: 'short' }).charAt(0).toUpperCase() + 
              date.toLocaleDateString('fr-FR', { month: 'short' }).slice(1),
        vulns: vulnsThisMonth,
        scoreMoyen: 6.8,
      });
    }

    const kpis = {
      totalVulnerabilites,
      vulnsCritiques,
      vulnsCorrigees,
      pourcentageCritiquesResolus,
      delaiMoyenCorrection: 14,
      scoreISO27001: gapAnalysis.scoreGlobal,        // ← SYNCHRONISÉ
      lastUpdated: new Date().toISOString(),
      lastScan: lastScan?.createdAt || null,
      cvssDistribution,
      temporalTrends,
      role: userRole,
    };

    return NextResponse.json({ success: true, data: kpis });

  } catch (error) {
    console.error('API KPIs Error:', error);
    return NextResponse.json({
      success: false,
      error: "Erreur interne lors du calcul des KPIs"
    }, { status: 500 });
  }
}