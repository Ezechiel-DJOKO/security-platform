import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { triggerScanBackground } from '@/lib/scan';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Exemple : Lancer un scan planifié via cron (à adapter selon tes besoins)
    console.log("[CRON] Vérification des scans planifiés...");

    // Tu peux ici ajouter la logique pour scanner les scans en PLANIFIE
    // Pour l'instant on log simplement

    return NextResponse.json({ 
      status: "success", 
      message: "Cron job exécuté avec succès" 
    });

  } catch (error: any) {
    console.error("[CRON ERROR]:", error);
    return NextResponse.json({ 
      status: "error", 
      message: error.message 
    }, { status: 500 });
  }
}