import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Récupérer l'état actuel pour faire le toggle
    const utilisateurActuel = await prisma.utilisateur.findUnique({
      where: { id },
      select: { actif: true }
    });

    if (!utilisateurActuel) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    // Toggle du statut actif
    const utilisateur = await prisma.utilisateur.update({
      where: { id },
      data: {
        actif: !utilisateurActuel.actif
      }
    });

    return NextResponse.json({
      success: true,
      data: utilisateur,
      message: `Utilisateur ${utilisateur.actif ? 'activé' : 'désactivé'} avec succès`
    });

  } catch (error: any) {
    console.error("Erreur toggle utilisateur:", error);
    return NextResponse.json({ 
      error: error.message || "Erreur lors du changement de statut" 
    }, { status: 500 });
  }
}