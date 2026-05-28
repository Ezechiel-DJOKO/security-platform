// src/app/api/cron/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
// ✅ Correction 1 : Importation de la fonction manquante depuis vos services de scan
import { triggerNucleiScan } from '@/lib/scan'; 

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    console.log("🕒 [CRON] Vérification des actifs sans scan...");

    // Trouver les actifs qui n'ont aucun scan enregistré
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
      // Création d'une nouvelle instance de scan en BDD pour cet actif
      const nouveauScan = await prisma.scan.create({
        data: {
          idActif: actif.id,
          lancerPar: "SYSTEM_CRON",
          type: "VULNERABILITE",
          outil: "NUCLEI",
          statut: "PLANIFIE",
        }
      });

      // ✅ Correction 2 : On passe l'ID du scan fraîchement créé (nouveauScan.id) 
      // au lieu de la variable inexistante 'scanId'
      triggerNucleiScan(nouveauScan.id);
    }

    return NextResponse.json({ 
      success: true, 
      scansLances: actifsAAnalyser.length 
    });

  } catch (error: any) {
    console.error("❌ [CRON ERROR]:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
