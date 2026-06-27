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
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const maintenant = new Date();

    // ============================================================
    // GAP ANALYSIS (conformité ISO 27001)
    // ============================================================
    const gapAnalysis = await calculateGapAnalysis();

    // ============================================================
    // STATS VULNÉRABILITÉS
    // ============================================================
    const [
      totalVulnerabilites,
      vulnsCritiques,
      vulnsHautes,
      vulnsMoyennes,
      vulnsFaibles,
      vulnsCorrigees,
      vulnsOuvertes,
      vulnsEnCours,
      cvssDistributionRaw,
      lastScan,
      totalScans,
      totalActifs,
    ] = await Promise.all([
      prisma.vulnerabilite.count({ where: { deletedAt: null } }),

      prisma.vulnerabilite.count({
        where: { deletedAt: null, severite: 'CRITICAL' }
      }),
      prisma.vulnerabilite.count({
        where: { deletedAt: null, severite: 'HIGH' }
      }),
      prisma.vulnerabilite.count({
        where: { deletedAt: null, severite: 'MEDIUM' }
      }),
      prisma.vulnerabilite.count({
        where: { deletedAt: null, severite: 'LOW' }
      }),

      prisma.vulnerabilite.count({
        where: {
          deletedAt: null,
          statut   : { in: ['CORRIGEE', 'VERIFIEE'] },
        }
      }),
      prisma.vulnerabilite.count({
        where: { deletedAt: null, statut: 'OUVERTE' }
      }),
      prisma.vulnerabilite.count({
        where: { deletedAt: null, statut: 'EN_COURS' }
      }),

      prisma.vulnerabilite.groupBy({
        by    : ['severite'],
        where : { deletedAt: null },
        _count: { id: true },
      }),

      prisma.scan.findFirst({
        orderBy: { createdAt: 'desc' },
        select : { createdAt: true, type: true, outil: true },
      }),

      prisma.scan.count(),
      prisma.actif.count({ where: { deletedAt: null } }),
    ]);

    const tauxCorrection = totalVulnerabilites > 0
      ? Math.round((vulnsCorrigees / totalVulnerabilites) * 100)
      : 0;

    const pourcentageCritiquesResolus = vulnsCritiques > 0
      ? Math.round((vulnsCorrigees / vulnsCritiques) * 100)
      : 0;

    // ============================================================
    // STATS PLANS DE CORRECTION
    // ============================================================
    const [
      plansTotal,
      plansAFaire,
      plansEnCours,
      plansTermines,
      plansVerifies,
      plansAnnules,
    ] = await Promise.all([
      prisma.planCorrection.count(),
      prisma.planCorrection.count({ where: { statut: 'A_FAIRE' } }),
      prisma.planCorrection.count({ where: { statut: 'EN_COURS' } }),
      prisma.planCorrection.count({ where: { statut: 'TERMINE' } }),
      prisma.planCorrection.count({ where: { statut: 'VERIFIE' } }),
      prisma.planCorrection.count({ where: { statut: 'ANNULE' } }),
    ]);

    const plansEnRetard = await prisma.planCorrection.count({
      where: {
        dateEcheance: { lt: maintenant },
        statut      : { notIn: ['TERMINE', 'VERIFIE', 'ANNULE'] },
      }
    });

    // Délai moyen de correction
    const plansAvecResolution = await prisma.planCorrection.findMany({
      where : {
        statut        : { in: ['TERMINE', 'VERIFIE'] },
        dateResolution: { not: null },
      },
      select: { createdAt: true, dateResolution: true },
    });

    const delaiMoyenCorrection = plansAvecResolution.length > 0
      ? Math.round(
          plansAvecResolution.reduce((acc, p) => {
            const diff = p.dateResolution!.getTime() - p.createdAt.getTime();
            return acc + diff / (1000 * 60 * 60 * 24);
          }, 0) / plansAvecResolution.length
        )
      : 14; // Valeur par défaut si aucun plan résolu

    // ============================================================
    // DISTRIBUTION CVSS (pour PieChart)
    // ============================================================
    const severityColors: Record<string, string> = {
      CRITICAL: '#ef4444',
      HIGH    : '#f97316',
      MEDIUM  : '#eab308',
      LOW     : '#22c55e',
    };

    const severityLabels: Record<string, string> = {
      CRITICAL: 'Critique',
      HIGH    : 'Élevé',
      MEDIUM  : 'Moyen',
      LOW     : 'Bas',
    };

    const cvssDistribution = cvssDistributionRaw
      .filter(item => item.severite)
      .map(item => ({
        name : severityLabels[item.severite] ?? item.severite,
        value: item._count.id,
        color: severityColors[item.severite] ?? '#64748b',
      }))
      .sort((a, b) => b.value - a.value);

    // ============================================================
    // RÉPARTITION SÉVÉRITÉ (pour RapportsAdmin)
    // ============================================================
    const repartitionSeverite = [
      { name: 'Critique', value: vulnsCritiques, color: '#ef4444' },
      { name: 'Haute',    value: vulnsHautes,    color: '#f97316' },
      { name: 'Moyenne',  value: vulnsMoyennes,  color: '#eab308' },
      { name: 'Faible',   value: vulnsFaibles,   color: '#22c55e' },
    ];

    // ============================================================
    // RÉPARTITION STATUT PLANS (pour RapportsAdmin)
    // ============================================================
    const repartitionStatut = [
      { name: 'À faire',  value: plansAFaire,  color: '#64748b' },
      { name: 'En cours', value: plansEnCours, color: '#3b82f6' },
      { name: 'Terminés', value: plansTermines + plansVerifies, color: '#22c55e' },
      { name: 'Annulés',  value: plansAnnules, color: '#94a3b8' },
    ];

    // ============================================================
    // ÉVOLUTION MENSUELLE (6 derniers mois)
    // ============================================================
    const evolutionMensuelle = await Promise.all(
      Array.from({ length: 6 }, async (_, i) => {
        const date  = subMonths(new Date(), 5 - i);
        const start = startOfMonth(date);
        const end   = endOfMonth(date);

        const [incidents, corriges, scans] = await Promise.all([
          prisma.vulnerabilite.count({
            where: { deletedAt: null, dateDecouverte: { gte: start, lte: end } }
          }),
          prisma.vulnerabilite.count({
            where: {
              deletedAt     : null,
              statut        : { in: ['CORRIGEE', 'VERIFIEE'] },
              dateCorrection: { gte: start, lte: end },
            }
          }),
          prisma.scan.count({
            where: { createdAt: { gte: start, lte: end } }
          }),
        ]);

        const label = date.toLocaleDateString('fr-FR', { month: 'short' });
        const mois  = label.charAt(0).toUpperCase() + label.slice(1);

        return {
          mois,
          incidents,
          resolution: incidents > 0 ? Math.round((corriges / incidents) * 100) : 0,
          scans,
          // Rétrocompatibilité avec l'ancien format
          vulns     : incidents,
          scoreMoyen: 6.8,
        };
      })
    );

    // ============================================================
    // TOP ACTIFS VULNÉRABLES
    // ============================================================
    const actifsAvecVulns = await prisma.actif.findMany({
      where  : { deletedAt: null },
      include: {
        vulnerabilites: {
          where : { deletedAt: null },
          select: { id: true, severite: true },
        }
      },
      orderBy: { vulnerabilites: { _count: 'desc' } },
      take   : 8,
    });

    const topActifs = actifsAvecVulns.map(a => ({
      nom      : a.nom,
      nbVulns  : a.vulnerabilites.length,
      criticite: a.criticite,
      critiques: a.vulnerabilites.filter(v => v.severite === 'CRITICAL').length,
    }));

    // ============================================================
    // PERFORMANCE TECHNICIENS
    // ============================================================
    const techniciens = await prisma.utilisateur.findMany({
      where  : { role: 'TECHNICIEN', actif: true, deletedAt: null },
      include: {
        plansAssignes: {
          select: {
            statut        : true,
            createdAt     : true,
            dateResolution: true,
          }
        }
      }
    });

    const performanceTechniciens = techniciens
      .filter(t => t.plansAssignes.length > 0)
      .map(t => {
        const termines = t.plansAssignes.filter(
          p => ['TERMINE', 'VERIFIE'].includes(p.statut)
        );
        const delaiMoyen = termines.length > 0 && termines.some(p => p.dateResolution)
          ? Math.round(
              termines
                .filter(p => p.dateResolution)
                .reduce((acc, p) => {
                  return acc + (p.dateResolution!.getTime() - p.createdAt.getTime()) / (1000 * 60 * 60 * 24);
                }, 0) / termines.filter(p => p.dateResolution).length
            )
          : 0;

        return {
          nom          : `${t.prenom} ${t.nom}`,
          plansTotal   : t.plansAssignes.length,
          plansTermines: termines.length,
          delaiMoyen,
        };
      })
      .sort((a, b) => b.plansTermines - a.plansTermines);

    // ============================================================
    // RÉPONSE FINALE
    // ============================================================
    const kpis = {
      // ── Données originales (rétrocompatibilité) ──────────────
      totalVulnerabilites,
      vulnsCritiques,
      vulnsCorrigees,
      pourcentageCritiquesResolus,
      delaiMoyenCorrection,
      scoreISO27001      : gapAnalysis.scoreGlobal,
      lastUpdated        : new Date().toISOString(),
      lastScan           : lastScan?.createdAt ?? null,
      cvssDistribution,
      temporalTrends     : evolutionMensuelle,  // alias
      role               : session.user.role,

      // ── Nouvelles données pour RapportsAdmin ─────────────────
      vulnsHautes,
      vulnsMoyennes,
      vulnsFaibles,
      vulnsOuvertes,
      vulnsEnCours,
      tauxCorrection,
      totalScans,
      totalActifs,
      plansTotal,
      plansEnRetard,
      plansTermines      : plansTermines + plansVerifies,
      evolutionMensuelle,
      repartitionSeverite,
      repartitionStatut,
      topActifs,
      performanceTechniciens,
    };

    return NextResponse.json({ success: true, data: kpis });

  } catch (error: any) {
    console.error('[API KPIs] Erreur:', error);
    return NextResponse.json({
      success: false,
      error  : 'Erreur interne lors du calcul des KPIs',
    }, { status: 500 });
  }
}