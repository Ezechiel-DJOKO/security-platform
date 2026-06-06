// src/app/api/compliance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { calculateGapAnalysis } from '@/lib/conformite/gapAnalysisService';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const referentiel = searchParams.get('referentiel') || 'ISO27001';
  const domaineFilter = searchParams.get('domaine');

  try {
    const gapAnalysis = await calculateGapAnalysis();

    let result = gapAnalysis;

    // Filtrage par domaine si demandé
    if (domaineFilter) {
      const filtered = gapAnalysis.domaines.filter(d =>
        d.domaine.toLowerCase().includes(domaineFilter.toLowerCase())
      );
      result = {
        ...gapAnalysis,
        domaines: filtered,
      };
    }

    return NextResponse.json({
      success: true,
      referentiel,
      data: result,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error("❌ Erreur API /compliance:", error);
    return NextResponse.json({
      success: false,
      error: "Erreur lors du calcul de l'analyse de conformité",
      message: error.message,
    }, { status: 500 });
  }
}

// POST : Pour actions futures (refresh, mise à jour manuelle, etc.)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.action === 'refresh') {
      const result = await calculateGapAnalysis();
      return NextResponse.json({
        success: true,
        message: "Analyse rafraîchie avec succès",
        data: result
      });
    }

    return NextResponse.json({ error: "Action non supportée" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}