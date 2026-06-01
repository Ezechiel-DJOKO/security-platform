// src/app/api/scans/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';   // Vérifie que ce chemin est correct

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
            localisation: true,
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
            recommandation: true,
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

    // Vérification de sécurité
    if (scan.lancerPar !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    return NextResponse.json({ scan });
  } catch (error: any) {
    console.error("Erreur GET /api/scans/[id]:", error);
    return NextResponse.json({
      error: "Erreur lors de la récupération du scan",
      details: error.message
    }, { status: 500 });
  }
}

// ====================== PATCH : Modifier un scan ======================
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const { statut } = await req.json();

    if (!statut) {
      return NextResponse.json({ error: "Le champ 'statut' est requis" }, { status: 400 });
    }

    const scan = await prisma.scan.update({
      where: { id },
      data: { 
        statut,
        // Mise à jour automatique de la date si terminé ou annulé
        ...( ['COMPLETED', 'FAILED', 'CANCELLED'].includes(statut) && { completedAt: new Date() })
      },
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
    console.error("Erreur PATCH /api/scans/[id]:", error);
    return NextResponse.json({ 
      error: "Erreur lors de la mise à jour du scan",
      details: error.message 
    }, { status: 500 });
  }
}

// ====================== DELETE : Annuler/Supprimer un scan ======================
export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const scan = await prisma.scan.update({
      where: { id },
      data: {
        statut: 'CANCELLED',
        completedAt: new Date()
      }
    });

    return NextResponse.json({
      message: "Scan annulé avec succès",
      scan
    });
  } catch (error: any) {
    console.error("Erreur DELETE /api/scans/[id]:", error);
    return NextResponse.json({ error: "Erreur lors de l'annulation" }, { status: 500 });
  }
}