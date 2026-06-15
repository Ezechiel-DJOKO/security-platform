import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { StatutScan } from '@prisma/client';
import { triggerScanBackground } from '@/lib/scan';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }   // ← Important
) {
  const { id: scanId } = await params;   // ← On attend le Promise

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const scan = await prisma.scan.findUnique({
      where: { id: scanId }
    });

    if (!scan) {
      return NextResponse.json({ error: "Scan non trouvé" }, { status: 404 });
    }

    if (scan.statut !== StatutScan.PLANIFIE) {
      return NextResponse.json({ error: "Le scan doit être en statut PLANIFIE" }, { status: 400 });
    }

    // Mise à jour immédiate
    await prisma.scan.update({
      where: { id: scanId },
      data: { 
        statut: StatutScan.EN_COURS, 
        debut: new Date() 
      }
    });

    // Lancement en arrière-plan
    triggerScanBackground(scanId).catch(err => {
      console.error("[BACKGROUND SCAN ERROR]", err);
    });

    return NextResponse.json({
      success: true,
      message: "Scan lancé avec succès (Flux 1)",
      scanId
    });

  } catch (error: any) {
    console.error("Erreur dans /launch:", error);
    return NextResponse.json({ 
      error: "Erreur interne lors du lancement",
      details: error.message 
    }, { status: 500 });
  }
}