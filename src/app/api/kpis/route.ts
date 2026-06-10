// src/app/api/kpis/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // === Statistiques principales ===
    const totalVulnerabilites = await prisma.vulnerabilite.count({
      where: { deletedAt: null }
    });

    const vulnsCritiques = await prisma.vulnerabilite.count({
      where: { 
        deletedAt: null,
        severite: { in: ['HIGH', 'CRITICAL'] } 
      }
    });

    const vulnsCorrigees = await prisma.vulnerabilite.count({
      where: { 
        deletedAt: null,
        statut: { in: ['CORRIGEE', 'VERIFIEE', 'RISQUE_ACCEPTE'] }
      }
    });

    const pourcentageCritiquesResolus = vulnsCritiques > 0 
      ? Math.round((vulnsCorrigees / vulnsCritiques) * 100) 
      : 0;

    // === Score ISO 27001 simulé (à améliorer plus tard) ===
    const scoreISO27001 = Math.floor(Math.random() * 35) + 65; // entre 65 et 99

    // === Données pour les graphiques ===
    const cvssDistribution = [
      { name: 'Critique', value: 12, color: '#ef4444' },
      { name: 'Élevé', value: 28, color: '#f59e0b' },
      { name: 'Moyen', value: 45, color: '#eab308' },
      { name: 'Bas', value: 15, color: '#22c55e' },
    ];

    const temporalTrends = [
      { mois: 'Mai', vulns: 45, scoreMoyen: 7.2 },
      { mois: 'Juin', vulns: 32, scoreMoyen: 6.8 },
    ];

    const kpis = {
      totalVulnerabilites,
      vulnsCritiques,
      vulnsCorrigees,
      pourcentageCritiquesResolus,
      delaiMoyenCorrection: 14, // à calculer plus tard via historique
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
    console.error(error);
    return NextResponse.json({
      success: false,
      error: "Erreur lors du calcul des KPIs"
    }, { status: 500 });
  }
}