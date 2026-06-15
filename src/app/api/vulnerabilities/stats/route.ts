import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const [critiques, ouvertes, corrigees] = await Promise.all([
      prisma.vulnerabilite.count({ where: { severite: 'CRITICAL' } }),
      prisma.vulnerabilite.count({ where: { statut: 'OUVERTE' } }),
      prisma.vulnerabilite.count({ where: { statut: 'CORRIGEE' } }),
    ]);

    const avgResult = await prisma.vulnerabilite.aggregate({
      _avg: { scoreCVSS: true },
    });

    return NextResponse.json({
      critiques,
      ouvertes,
      corrigees,
      risqueMoyen: avgResult._avg?.scoreCVSS ?? 0,
    });
  } catch (error: any) {
    console.error('Erreur stats vulnerabilités:', error.message);
    return NextResponse.json({
      critiques: 0,
      ouvertes: 0,
      corrigees: 0,
      risqueMoyen: 0,
    }, { status: 200 });
  }
}