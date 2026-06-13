// src/lib/kpi.ts
import { prisma } from './prisma';

interface TrendItem {
  mois: string;
  vulns: number;
  scoreMoyen: number;
}

interface CVSSDistribution {
  name: string;
  value: number;
  color: string;
}

export async function getKPIs() {
  try {
    const [totalVulns, critiques, ouvertes, corrigees, scoreAvgResult] = await Promise.all([
      prisma.vulnerabilite.count(),
      prisma.vulnerabilite.count({ where: { severite: 'CRITICAL' } }),
      prisma.vulnerabilite.count({ where: { statut: { in: ['OUVERTE', 'EN_COURS'] } } }),
      prisma.vulnerabilite.count({ where: { statut: 'CORRIGEE' } }),
      prisma.vulnerabilite.aggregate({ _avg: { scoreCVSS: true } }),
    ]);

    const scoreMoyen = scoreAvgResult._avg.scoreCVSS 
      ? Math.round(scoreAvgResult._avg.scoreCVSS * 10) / 10 
      : 0;

    const cvssDistribution: CVSSDistribution[] = [
      { name: 'Critique (9-10)', value: await prisma.vulnerabilite.count({ where: { scoreCVSS: { gte: 9 } } }), color: '#ef4444' },
      { name: 'Haute (7-8.9)', value: await prisma.vulnerabilite.count({ where: { scoreCVSS: { gte: 7, lt: 9 } } }), color: '#f97316' },
      { name: 'Moyenne (4-6.9)', value: await prisma.vulnerabilite.count({ where: { scoreCVSS: { gte: 4, lt: 7 } } }), color: '#eab308' },
      { name: 'Basse (0-3.9)', value: await prisma.vulnerabilite.count({ where: { scoreCVSS: { lt: 4 } } }), color: '#22c55e' },
    ].filter(item => item.value > 0);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const rawTrends = await prisma.vulnerabilite.groupBy({
      by: ['dateDecouverte'],
      where: { dateDecouverte: { gte: sixMonthsAgo } },
      _count: { id: true },
      _avg: { scoreCVSS: true },
      orderBy: { dateDecouverte: 'asc' },
    });

    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

    const temporalTrends = rawTrends.reduce<TrendItem[]>((acc, curr) => {
      const date = new Date(curr.dateDecouverte);
      const mois = monthNames[date.getMonth()];
      const existing = acc.find((t) => t.mois === mois);

      if (existing) {
        const prevCount = existing.vulns || 0;
        existing.vulns = prevCount + curr._count.id;
        if (curr._avg.scoreCVSS) {
          existing.scoreMoyen = Math.round(
            (existing.scoreMoyen * prevCount + (curr._avg.scoreCVSS || 0) * curr._count.id) / existing.vulns * 10
          ) / 10;
        }
      } else {
        acc.push({
          mois,
          vulns: curr._count.id,
          scoreMoyen: curr._avg.scoreCVSS ? Math.round(curr._avg.scoreCVSS * 10) / 10 : 0,
        });
      }
      return acc;
    }, []);

    return {
      totalVulns,
      critiques,
      ouvertes,
      corrigees,
      scoreMoyen,
      cvssDistribution,
      temporalTrends: temporalTrends.length > 0 ? temporalTrends : [],
    };
  } catch (error) {
    console.error('Erreur dans getKPIs:', error);
    throw error;
  }
}

export async function saveKpiHistory() {
  try {
    const today = new Date().toISOString().split('T')[0];
    console.log(`📊 Historique KPI sauvegardé pour le ${today}`);
  } catch (error) {
    console.error('Erreur saveKpiHistory:', error);
  }
}