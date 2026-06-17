// src/app/api/plans-correction/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { StatutPlan, Priorite } from '@prisma/client';

// ========== GET (existant) ==========
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const plans = await prisma.planCorrection.findMany({
      include: {
        vulnerabilite: {
          select: {
            id: true,
            titre: true,
            severite: true,
            scoreCVSS: true,
            cveId: true,
          }
        },
        assigne: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true,
          }
        }
      },
      orderBy: { 
        createdAt: 'desc' 
      },
    });

    return NextResponse.json(plans);
  } catch (error) {
    console.error("Erreur GET /plans-correction:", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la récupération des plans" }, 
      { status: 500 }
    );
  }
}

// ========== POST (CORRIGÉ) ==========
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();

    // Validation
    if (!body.idVulnerabilite) {
      return NextResponse.json({ error: "idVulnerabilite requis" }, { status: 400 });
    }

    const plan = await prisma.planCorrection.create({
      data: {
        idVulnerabilite: body.idVulnerabilite,
        assigneA: body.assigneA || session.user.id,  // ← CLÉ ÉTRANGÈRE DIRECTE
        priorite: body.priorite || Priorite.MOYENNE,
        dateEcheance: body.dateEcheance 
          ? new Date(body.dateEcheance) 
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        statut: body.statut || StatutPlan.A_FAIRE,
        commentaire: body.commentaire || undefined,
      },
      include: {
        vulnerabilite: {
          select: {
            id: true,
            titre: true,
            severite: true,
            scoreCVSS: true,
            cveId: true,
          }
        },
        assigne: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true,
          }
        }
      }
    });

    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    console.error("Erreur POST /plans-correction:", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la création du plan" }, 
      { status: 500 }
    );
  }
}