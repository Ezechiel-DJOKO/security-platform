import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { importResultsToPrisma } from '@/lib/importResultsService';
import { createCorrectionPlans } from '@/lib/planCorrectionService';
import { sendAlerts } from '@/lib/alertService';
import { StatutScan } from '@prisma/client';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const scanId = params.id;

  try {
    const body = await request.json();
    
    // Validation basique
    if (!body || !body.scanner) {
      return NextResponse.json({ 
        error: "Données de scan invalides" 
      }, { status: 400 });
    }

    console.log(`📥 Réception des résultats du scan ${scanId} (${body.scanner})`);

    // 1. Vérifier que le scan existe
    const scan = await prisma.scan.findUnique({
      where: { id: scanId }
    });

    if (!scan) {
      return NextResponse.json({ error: "Scan non trouvé" }, { status: 404 });
    }

    // 2. Importer les résultats dans Prisma
    const importResult = await importResultsToPrisma(scanId, body);

    // 3. Post-traitement automatique (comme dans le diagramme)
    await createCorrectionPlans(scanId);

    // 4. Envoyer les alertes et notifications
    await sendAlerts(scanId);

    // 5. Mettre à jour le statut du scan en TERMINE
    await prisma.scan.update({
      where: { id: scanId },
      data: {
        statut: StatutScan.TERMINE,
        fin: new Date(),
        resultatBrut: body,
      }
    });

    return NextResponse.json({
      success: true,
      message: "Résultats importés et post-traitement terminé avec succès",
      scanId,
      imported: importResult.imported,
      alertsSent: true
    });

  } catch (error: any) {
    console.error(`❌ Erreur lors de l'import du scan ${scanId}:`, error);

    // Mise à jour en erreur
    try {
      await prisma.scan.update({
        where: { id: scanId },
        data: {
          statut: StatutScan.ECHEC,
          erreur: error.message,
          fin: new Date()
        }
      });
    } catch (updateError) {
      console.error("Impossible de mettre à jour le statut d'erreur:", updateError);
    }

    return NextResponse.json({
      error: "Erreur lors de l'import des résultats",
      details: error.message
    }, { status: 500 });
  }
}