// src/app/api/cron/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { triggerNucleiScan } from '@/lib/scan';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    console.log("🕒 [CRON] Vérification des actifs sans scan...");

    const actifsAAnalyser = await prisma.actif.findMany({
      where: {
        scans: { none: {} }
      },
      take: 3 
    });

    if (actifsAAnalyser.length === 0) {
      return NextResponse.json({ message: "Aucun actif en attente de scan automatique" });
    }

    for (const actif of actifsAAnalyser) {
      const nouveauScan = await prisma.scan.create({
        data: {
          idActif: actif.id,
          lancerPar: "SYSTEM_CRON",
          type: "VULNERABILITE",
          outil: "NUCLEI",
          statut: "PLANIFIE",
        }
      });

      triggerNucleiScan(nouveauScan.id);
    }

    return NextResponse.json({ 
      success: true, 
      scansLances: actifsAAnalyser.length 
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue du cron';
    console.error("❌ [CRON ERROR]:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}