import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const [
      critiques,
      hautes,
      moyennes,
      basses,
      ouvertes,
    ] = await Promise.all([
      // Critiques
      prisma.vulnerabilite.count({
        where: { 
          severite: 'CRITICAL',
          deletedAt: null 
        }
      }),
      // Hautes
      prisma.vulnerabilite.count({
        where: { 
          severite: 'HIGH',
          deletedAt: null 
        }
      }),
      // Moyennes
      prisma.vulnerabilite.count({
        where: { 
          severite: 'MEDIUM',
          deletedAt: null 
        }
      }),
      // Basses
      prisma.vulnerabilite.count({
        where: { 
          severite: 'LOW',
          deletedAt: null 
        }
      }),
      // Ouvertes (statut OUVERTE uniquement)
      prisma.vulnerabilite.count({
        where: { 
          statut: 'OUVERTE',
          deletedAt: null 
        }
      }),
    ]);

    // Score moyen de risque (CVSS)
    const avgResult = await prisma.vulnerabilite.aggregate({
      _avg: { scoreCVSS: true },
      where: { deletedAt: null }
    });

    return NextResponse.json({
      critiques,
      hautes,
      moyennes,
      basses,
      ouvertes,
      risqueMoyen: avgResult._avg?.scoreCVSS ?? 0,
    });
  } catch (error: any) {
    console.error('Erreur stats vulnérabilités:', error.message);
    
    return NextResponse.json({
      critiques: 0,
      hautes: 0,
      moyennes: 0,
      basses: 0,
      ouvertes: 0,
      risqueMoyen: 0,
    }, { status: 200 });
  }
}