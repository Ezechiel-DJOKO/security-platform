import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { StatutPlan } from '@prisma/client';

export async function GET() {
  try {
    const now = new Date();

    // Comptage de tous les plans par statut
    const [
      total,
      aFaire,
      enCours,
      termine,
      verifie,
      annule,
      enRetard,
    ] = await Promise.all([
      // Total général
      prisma.planCorrection.count(),

      // A_FAIRE
      prisma.planCorrection.count({
        where: { statut: StatutPlan.A_FAIRE }
      }),

      // EN_COURS
      prisma.planCorrection.count({
        where: { statut: StatutPlan.EN_COURS }
      }),

      // TERMINE
      prisma.planCorrection.count({
        where: { statut: StatutPlan.TERMINE }
      }),

      // VERIFIE
      prisma.planCorrection.count({
        where: { statut: StatutPlan.VERIFIE }
      }),

      // ANNULE
      prisma.planCorrection.count({
        where: { statut: StatutPlan.ANNULE }
      }),

      // EN_RETARD : Plans non terminés dont la date d'échéance est dépassée
      prisma.planCorrection.count({
        where: {
          statut: {
            notIn: [StatutPlan.TERMINE, StatutPlan.VERIFIE, StatutPlan.ANNULE]
          },
          dateEcheance: {
            lt: now
          }
        }
      }),
    ]);

    return NextResponse.json({
      TOTAL: total,
      A_FAIRE: aFaire,
      EN_COURS: enCours,
      TERMINE: termine,
      VERIFIE: verifie,
      ANNULE: annule,
      EN_RETARD: enRetard,
    });
  } catch (error) {
    console.error("Erreur lors du calcul des stats des plans de correction :", error);
    
    return NextResponse.json({
      TOTAL: 0,
      A_FAIRE: 0,
      EN_COURS: 0,
      TERMINE: 0,
      VERIFIE: 0,
      ANNULE: 0,
      EN_RETARD: 0,
    }, { status: 500 });
  }
}