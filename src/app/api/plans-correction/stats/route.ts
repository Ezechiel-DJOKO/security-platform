// src/app/api/plans-correction/stats/route.ts   (ou où se trouve ce fichier)
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { StatutPlan } from '@prisma/client';

export async function GET() {
  try {
    const now = new Date();

    const [
      total,
      aFaire,
      enCours,
      termine,
      verifie,
      annule,
      enRetard,
    ] = await Promise.all([
      // Total général (seulement les plans actifs)
      prisma.planCorrection.count({
        where: {
          vulnerabilite: { deletedAt: null }
        }
      }),

      // A_FAIRE
      prisma.planCorrection.count({
        where: { 
          statut: StatutPlan.A_FAIRE,
          vulnerabilite: { deletedAt: null }
        }
      }),

      // EN_COURS
      prisma.planCorrection.count({
        where: { 
          statut: StatutPlan.EN_COURS,
          vulnerabilite: { deletedAt: null }
        }
      }),

      // TERMINE
      prisma.planCorrection.count({
        where: { 
          statut: StatutPlan.TERMINE,
          vulnerabilite: { deletedAt: null }
        }
      }),

      // VERIFIE
      prisma.planCorrection.count({
        where: { 
          statut: StatutPlan.VERIFIE,
          vulnerabilite: { deletedAt: null }
        }
      }),

      // ANNULE
      prisma.planCorrection.count({
        where: { 
          statut: StatutPlan.ANNULE,
          vulnerabilite: { deletedAt: null }
        }
      }),

      // EN_RETARD : Plans non terminés/vérifiés/annulés avec date dépassée
      prisma.planCorrection.count({
        where: {
          vulnerabilite: { deletedAt: null },
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