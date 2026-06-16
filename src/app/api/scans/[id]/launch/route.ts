// src/app/api/scans/[id]/launch/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { StatutScan } from '@prisma/client';
import { triggerScanBackground } from '@/lib/scan';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: scanId } = await params;

  try {
    // === SOLUTION AUTH ===
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      console.warn("❌ Session non trouvée dans /launch");
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const scan = await prisma.scan.findUnique({
      where: { id: scanId },
      include: { actif: true }
    });

    if (!scan) {
      return NextResponse.json({ error: "Scan non trouvé" }, { status: 404 });
    }

    if (scan.statut !== StatutScan.PLANIFIE) {
      return NextResponse.json({ 
        error: "Le scan doit être en statut PLANIFIE" 
      }, { status: 400 });
    }

    // Mise à jour du statut
    await prisma.scan.update({
      where: { id: scanId },
      data: {
        statut: StatutScan.EN_COURS,
        debut: new Date(),
      }
    });

    console.log(`🚀 Lancement scan ${scanId} par utilisateur ${session.user.id}`);

    // Lancement en arrière-plan
    triggerScanBackground(scanId).catch(err => {
      console.error("[BACKGROUND ERROR]", err);
    });

    return NextResponse.json({
      success: true,
      message: "Scan lancé avec succès (Flux 1)",
      scanId
    });

  } catch (error: any) {
    console.error("Erreur dans /api/scans/[id]/launch:", error);
    return NextResponse.json({
      error: "Erreur interne",
      details: error.message
    }, { status: 500 });
  }
}