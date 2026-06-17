import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const plans = await prisma.planCorrection.findMany({
      include: {
        vulnerabilite: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(plans);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}