// src/app/api/scans/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { StatutScan } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

interface Params {
  params: Promise<{ id: string }>;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Une erreur inattendue est survenue';
}

const VALID_STATUTS: StatutScan[] = [
  'PLANIFIE',
  'EN_COURS',
  'TERMINE',
  'ANNULE',
  'ECHEC',
];

const STATUTS_TERMINAUX: StatutScan[] = ['TERMINE', 'ANNULE', 'ECHEC'];

function isValidStatut(value: unknown): value is StatutScan {
  return typeof value === 'string' && VALID_STATUTS.includes(value as StatutScan);
}

// ====================== GET : Détails d'un scan ======================
export async function GET(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  try {
    const scan = await prisma.scan.findUnique({
      where: { id },
      include: {
        actif: {
          select: {
            id: true,
            nom: true,
            adresseIP: true,
            hostname: true,
            type: true,
            criticite: true,
            localisation: true,
          },
        },
        utilisateur: {
          select: { nom: true, prenom: true, email: true },
        },
        vulnerabilites: {
          select: {
            id: true,
            titre: true,
            severite: true,
            scoreCVSS: true,
            statut: true,
            cveId: true,
            recommandation: true,
          },
          orderBy: { severite: 'desc' },
        },
        controlesEvalues: {
          include: {
            controle: true,
          },
        },
      },
    });

    if (!scan) {
      return NextResponse.json({ error: 'Scan non trouvé' }, { status: 404 });
    }

    // Vérification de sécurité
    if (scan.lancerPar !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    return NextResponse.json({ scan });
  } catch (error: unknown) {
    console.error('Erreur GET /api/scans/[id]:', error);
    return NextResponse.json(
      {
        error: 'Erreur lors de la récupération du scan',
        details: getErrorMessage(error),
      },
      { status: 500 },
    );
  }
}

// ====================== PATCH : Modifier un scan ======================
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  try {
    const body: unknown = await req.json();

    if (!body || typeof body !== 'object' || !('statut' in body)) {
      return NextResponse.json(
        { error: "Le champ 'statut' est requis" },
        { status: 400 },
      );
    }

    const { statut } = body as { statut: unknown };

    if (!isValidStatut(statut)) {
      return NextResponse.json(
        {
          error: `Statut invalide. Valeurs acceptées: ${VALID_STATUTS.join(', ')}`,
        },
        { status: 400 },
      );
    }

    const scan = await prisma.scan.update({
      where: { id },
      data: {
        statut,
        ...(STATUTS_TERMINAUX.includes(statut) && { completedAt: new Date() }),
      },
      include: {
        actif: { select: { nom: true } },
        utilisateur: { select: { nom: true } },
      },
    });

    return NextResponse.json({
      message: `Scan mis à jour avec succès (statut: ${statut})`,
      scan,
    });
  } catch (error: unknown) {
    console.error('Erreur PATCH /api/scans/[id]:', error);
    return NextResponse.json(
      {
        error: 'Erreur lors de la mise à jour du scan',
        details: getErrorMessage(error),
      },
      { status: 500 },
    );
  }
}

// ====================== DELETE : Annuler/Supprimer un scan ======================
export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  try {
    const scan = await prisma.scan.update({
      where: { id },
      data: {
        statut: 'TERMINE',
        fin: new Date(),
      },
    });

    return NextResponse.json({
      message: 'Scan annulé avec succès',
      scan,
    });
  } catch (error: unknown) {
    console.error('Erreur DELETE /api/scans/[id]:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'annulation' },
      { status: 500 },
    );
  }
}