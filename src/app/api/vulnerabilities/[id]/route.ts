// src/app/api/vulnerabilities/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import {
  TypeAction,
  EntiteCible,
  StatutVulnerabilite,
} from '@prisma/client';

// ============================================================
// SCHÉMA DE VALIDATION
// ============================================================

const updateVulnerabilitySchema = z.object({
  titre          : z.string().min(3).optional(),
  description    : z.string().optional(),
  severite       : z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  scoreCVSS      : z.number().min(0).max(10).optional(),
  epssScore      : z.number().min(0).max(1).optional(),
  vecteurCVSS    : z.string().optional(),
  statut         : z.enum([
    'OUVERTE', 'EN_COURS', 'CORRIGEE',
    'IGNORE', 'RISQUE_ACCEPTE', 'VERIFIEE',
  ]).optional(),
  assigneA       : z.string().uuid().optional().nullable(),
  preuve         : z.string().optional(),
  impact         : z.string().optional(),
  recommandation : z.string().optional(),
  commentaire    : z.string().optional(),           // ← pour l'historique
  dateCorrection : z.string().datetime().optional().nullable(),
});

// ============================================================
// HELPERS
// ============================================================

function calculateRisqueRelatif(
  scoreCVSS : number | null | undefined,
  epssScore : number | null | undefined,
  severite  : string
): number {
  if (!scoreCVSS) return 0;

  let baseRisk = scoreCVSS;
  if (epssScore) baseRisk += epssScore * 4;

  const multipliers: Record<string, number> = {
    CRITICAL: 1.4,
    HIGH    : 1.2,
    MEDIUM  : 1.0,
    LOW     : 0.7,
  };

  const risque = baseRisk * (multipliers[severite] ?? 1.0);
  return Math.min(Math.max(Math.round(risque * 10) / 10, 0), 10);
}

// ⭐ Include complet pour le modal
const VULN_INCLUDE = {
  actif: {
    select: {
      id        : true,
      nom       : true,
      adresseIP : true,
      hostname  : true,
      type      : true,
      criticite : true,
    }
  },
  scan: {
    select: {
      id        : true,
      type      : true,
      outil     : true,
      cible     : true,
      createdAt : true,
      statut    : true,
    }
  },
  assigne: {
    select: {
      id     : true,
      nom    : true,
      prenom : true,
      email  : true,
    }
  },
  plan: {
    select: {
      id           : true,
      priorite     : true,
      statut       : true,
      dateEcheance : true,
      commentaire  : true,
    }
  },
  historiques: {
    orderBy : { dateModification: 'desc' as const },
    take    : 50,
    include : {
      utilisateur: {
        select: { prenom: true, nom: true }
      }
    }
  },
  tags: {
    include: {
      tag: { select: { nom: true, couleur: true } }
    }
  },
} as const;

// ============================================================
// GET — Récupérer une vulnérabilité complète
// ============================================================

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'ID manquant' }, { status: 400 });
    }

    const vulnerability = await prisma.vulnerabilite.findUnique({
      where  : { id },
      include: VULN_INCLUDE,
    });

    if (!vulnerability) {
      return NextResponse.json(
        { error: 'Vulnérabilité non trouvée' },
        { status: 404 }
      );
    }

    // ⭐ Enrichissement : lien NVD
    const enriched = {
      ...vulnerability,
      nvdUrl: vulnerability.cveId
        ? `https://nvd.nist.gov/vuln/detail/${vulnerability.cveId}`
        : null,
    };

    // ⭐ Log de lecture (non bloquant)
    if (session.user?.id) {
      prisma.auditLog.create({
        data: {
          idUtilisateur : session.user.id,
          action        : TypeAction.LECTURE,        // ← enum Prisma correct
          entite        : EntiteCible.VULNERABILITE, // ← enum Prisma correct
          idEntite      : id,
          details       : { titre: vulnerability.titre },
        }
      }).catch(() => {});
    }

    return NextResponse.json(enriched);

  } catch (err: any) {
    console.error('[API] GET /vulnerabilities/[id]:', err.message);
    return NextResponse.json(
      { error: 'Erreur serveur', details: err.message },
      { status: 500 }
    );
  }
}

// ============================================================
// PUT — Mettre à jour une vulnérabilité
// ============================================================

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id }    = await params;
    const body      = await req.json();
    const validated = updateVulnerabilitySchema.parse(body);

    const existing = await prisma.vulnerabilite.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Vulnérabilité non trouvée' },
        { status: 404 }
      );
    }

    const risqueRelatif = calculateRisqueRelatif(
      validated.scoreCVSS ?? existing.scoreCVSS,
      validated.epssScore ?? existing.epssScore,
      validated.severite  ?? existing.severite,
    );

    const statutChange =
      validated.statut !== undefined &&
      validated.statut !== existing.statut;

    // ⭐ Transaction : update + historique + audit
    const { commentaire, ...updateData } = validated;

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Mise à jour de la vulnérabilité
      const vuln = await tx.vulnerabilite.update({
        where  : { id },
        data   : { ...updateData, risqueRelatif },
        include: VULN_INCLUDE,
      });

      // 2. Historique si statut change
      if (statutChange && session.user?.id) {
        await tx.historiqueVulnerabilite.create({
          data: {
            idVulnerabilite  : id,
            modifiePar       : session.user.id,   // ← champ correct du schema
            ancienStatut     : existing.statut as StatutVulnerabilite,
            nouveauStatut    : validated.statut!  as StatutVulnerabilite,
            dateModification : new Date(),
            commentaire      : commentaire ?? null,
          }
        });
      }

      // 3. Log audit
      if (session.user?.id) {
        await tx.auditLog.create({
          data: {
            idUtilisateur : session.user.id,
            action        : TypeAction.MODIFICATION,   // ← enum correct
            entite        : EntiteCible.VULNERABILITE, // ← enum correct
            idEntite      : id,
            details       : {
              champsModifies : Object.keys(updateData),
              ancienStatut   : statutChange ? existing.statut : undefined,
              nouveauStatut  : statutChange ? validated.statut : undefined,
            },
          }
        });
      }

      return vuln;
    });

    return NextResponse.json(updated);

  } catch (err: any) {
    console.error('[API] PUT /vulnerabilities/[id]:', err.message);

    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: err.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erreur serveur', details: err.message },
      { status: 500 }
    );
  }
}

// ============================================================
// DELETE — Soft Delete
// ============================================================

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.vulnerabilite.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Vulnérabilité non trouvée' },
        { status: 404 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // 1. Soft delete
      await tx.vulnerabilite.update({
        where: { id },
        data : {
          deletedAt : new Date(),
          statut    : StatutVulnerabilite.IGNORE,
        }
      });

      // 2. Log audit avec les bons enums
      if (session.user?.id) {
        await tx.auditLog.create({
          data: {
            idUtilisateur : session.user.id,
            action        : TypeAction.SUPPRESSION,    // ← enum correct
            entite        : EntiteCible.VULNERABILITE, // ← enum correct
            idEntite      : id,
            details       : {
              titre   : existing.titre,
              severite: existing.severite,
            },
          }
        });
      }
    });

    return NextResponse.json({
      message: 'Vulnérabilité supprimée (soft delete)',
      id,
    });

  } catch (err: any) {
    console.error('[API] DELETE /vulnerabilities/[id]:', err.message);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression', details: err.message },
      { status: 500 }
    );
  }
}