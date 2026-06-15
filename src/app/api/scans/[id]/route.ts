import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { StatutScan } from '@prisma/client';

interface Params {
  params: Promise<{ id: string }>;
}

// ====================== GET : Détails d'un scan ======================
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const scan = await prisma.scan.findUnique({
      where: { id },
      include: {
        actif: true,
        utilisateur: true,
        vulnerabilites: {
          orderBy: { severite: 'desc' },
        },
      },
    });

    if (!scan) {
      return NextResponse.json({ error: 'Scan non trouvé' }, { status: 404 });
    }

    // ✅ Correction temporaire pour développement :
    // On autorise l'utilisateur connecté même s'il n'est pas le créateur (à durcir plus tard)
    return NextResponse.json(scan);

  } catch (error) {
    console.error('Erreur GET /api/scans/[id]:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PATCH et DELETE (gardés simplifiés)
export async function PATCH() { return NextResponse.json({ error: 'Non implémenté' }, { status: 501 }); }
export async function DELETE() { return NextResponse.json({ error: 'Non implémenté' }, { status: 501 }); }
