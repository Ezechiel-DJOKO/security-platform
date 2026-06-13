import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Récupérer l'utilisateur actuel
    const user = await prisma.utilisateur.findUnique({
      where: { id: params.id },
      select: { actif: true }
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // Inverser le statut
    const updatedUser = await prisma.utilisateur.update({
      where: { id: params.id },
      data: { 
        actif: !user.actif   // ← Correction ici
      }
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}