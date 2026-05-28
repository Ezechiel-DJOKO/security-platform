// src/app/api/scans/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

interface Params {
  params: Promise<{ id: string }>;
}

// ====================== GET : Détails d'un scan ======================
export async function GET(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
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
            localisation: true
          }
        },
        utilisateur: {
          select: { nom: true, prenom: true, email: true }
        },
        vulnerabilites: {
          select: {
            id: true,
            titre: true,
            severite: true,
            scoreCVSS: true,
            statut: true,
            cveId: true,
            recommandation: true
          },
          orderBy: { severite: 'desc' }
        },
        controlesEvalues: {
          include: {
            controle: true
          }
        }
      }
    });

    if (!scan) {
      return NextResponse.json({ error: "Scan non trouvé" }, { status: 404 });
    }

    // Vérification de sécurité : l'utilisateur doit être celui qui a lancé le scan ou un ADMIN
    if (scan.lancerPar !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    return NextResponse.json({ scan });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ 
      error: "Erreur lors de la récupération du scan",
      details: error.message 
    }, { status: 500 });
  }
}

// ====================== PATCH : Modifier un scan (ex: annuler) ======================
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const { statut } = await req.json();

    const scan = await prisma.scan.update({
      where: { id },
      data: { statut },
      include: {
        actif: { select: { nom: true } },
        utilisateur: { select: { nom: true } }
      }
    });

    return NextResponse.json({
      message: `Scan mis à jour avec succès (statut: ${statut})`,
      scan
    });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 });
  }
}