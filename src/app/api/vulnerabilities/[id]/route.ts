// src/app/api/vulnerabilities/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { error } from 'console';

// Schéma de validation
const updateVulnerabilitySchema = z.object({
  titre: z.string().min(3).optional(),
  description: z.string().optional(),
  severite: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  scoreCVSS: z.number().min(0).max(10).optional(),
  epssScore: z.number().min(0).max(1).optional(),
  vecteurCVSS: z.string().optional(),
  statut: z.enum(['OUVERTE', 'EN_COURS', 'CORRIGEE', 'IGNORE', 'RISQUE_ACCEPTE', 'VERIFIEE']).optional(),
  assigneA: z.string().uuid().optional().nullable(),
  preuve: z.string().optional(),
  impact: z.string().optional(),
  recommandation: z.string().optional(),
  dateCorrection: z.string().datetime().optional().nullable(),
});

// Calcul du risque relatif
function calculateRisqueRelatif(
  scoreCVSS: number | null | undefined,
  epssScore: number | null | undefined,
  severite: string
): number {
  if (!scoreCVSS) return 0;
  
  let baseRisk = scoreCVSS;
  if (epssScore) baseRisk += epssScore * 4;

  const severityMultiplier: Record<string, number> = {
    CRITICAL: 1.4,
    HIGH: 1.2,
    MEDIUM: 1.0,
    LOW: 0.7,
  };

  const risque = baseRisk * (severityMultiplier[severite] || 1.0);
  return Math.min(Math.max(Math.round(risque * 10) / 10, 0), 10);
}

// GET - Récupérer une vulnérabilité
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;

  const vulnerability = await prisma.vulnerabilite.findUnique({
    where: { id },
    include: {
      scan: {
        select: { 
          id: true, 
          type: true, 
          cible: true, 
          createdAt: true 
        }
      },
      assigne: {
        select: { id: true, nom: true, prenom: true, email: true }
      },
      plan: true,
      historiques: {
        orderBy: { dateModification: 'desc' },
        take: 10,
      },
    }
  });

  if (!vulnerability) {
    return NextResponse.json({ error: "Vulnérabilité non trouvée" }, { status: 404 });
  }

  return NextResponse.json(vulnerability);
}

// PUT - Mise à jour
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const validated = updateVulnerabilitySchema.parse(body);

    const existing = await prisma.vulnerabilite.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Vulnérabilité non trouvée" }, { status: 404 });
    }

    const risqueRelatif = calculateRisqueRelatif(
      validated.scoreCVSS ?? existing.scoreCVSS,
      validated.epssScore ?? existing.epssScore,
      validated.severite ?? existing.severite
    );

    const updatedVulnerability = await prisma.vulnerabilite.update({
      where: { id },
      data: {
        ...validated,
        risqueRelatif,
      },
      include: {
        scan: true,
        assigne: true,
        plan: true,
      }
    });

    return NextResponse.json(updatedVulnerability);
  } catch (e) {
    console.error(e);
    return NextResponse.json({
      error: "Données invalides",
      details: error.errors || error.messaage
    }, { status: 400 });
  }
}

// DELETE - Soft Delete
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await prisma.vulnerabilite.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        statut: 'IGNORE'
      }
    });

    return NextResponse.json({
      message: "Vulnérabilité supprimée (soft delete)",
      id
    });
  } catch (error) {
    return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 500 });
  }
}