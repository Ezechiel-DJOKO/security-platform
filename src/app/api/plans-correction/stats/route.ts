import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const [total, enCours, termine, enRetard] = await Promise.all([
      prisma.planCorrection.count(),
      prisma.planCorrection.count({ where: { statut: 'EN_COURS' } }),
      prisma.planCorrection.count({ where: { statut: 'TERMINE' } }),
      prisma.planCorrection.count({
        where: {
          statut: { not: 'TERMINE' },
          dateEcheance: { lt: new Date() }
        }
      }),
    ]);

    // A_VALIDER n'existe pas encore dans ton enum → on le met à 0 pour l'instant
    return NextResponse.json({
      TOTAL: total,
      EN_COURS: enCours,
      A_VALIDER: 0,           // À activer plus tard quand tu ajouteras le statut
      TERMINE: termine,
      EN_RETARD: enRetard,
    });
  } catch (error) {
    console.error("Erreur stats plans:", error);
    return NextResponse.json({
      TOTAL: 0,
      EN_COURS: 0,
      A_VALIDER: 0,
      TERMINE: 0,
      EN_RETARD: 0,
    });
  }
}