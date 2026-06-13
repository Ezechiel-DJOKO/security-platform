import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const users = await prisma.utilisateur.findMany({
      select: {
        id: true,
        nom: true,           // ← Correction
        prenom: true,        // ← Correction
        email: true,
        role: true,
        actif: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    // Formatage pour correspondre à ce qu'attend le frontend
    const formattedUsers = users.map(user => ({
      id: user.id,
      nomUtilisateur: user.nom,
      prenomUtilisateur: user.prenom,
      email: user.email,
      role: user.role,
      actif: user.actif,
      createdAt: user.createdAt.toISOString(),
    }));

    return NextResponse.json(formattedUsers);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}