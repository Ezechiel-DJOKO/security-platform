import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/lib/auth';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const users = await prisma.utilisateur.findMany({
    where: { actif: true },
    select: {
      id: true,
      nom: true,
      prenom: true,
      email: true,
      role: true,
    },
    orderBy: { nom: 'asc' }
  });

  return NextResponse.json({ data: users });
}