// src/app/api/kpis/route.ts
import { NextResponse } from 'next/server';
import { getKPIs, saveKpiHistory } from '@/lib/kpi';

export async function GET() {
  try {
    const kpis = await getKPIs();
    
    // Sauvegarde automatique de l'historique (une fois par jour)
    await saveKpiHistory().catch(console.error);

    return NextResponse.json({
      success: true,
      data: kpis,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erreur lors du calcul des KPIs:', error);
    return NextResponse.json({
      success: false,
      error: 'Erreur interne lors du calcul des KPIs'
    }, { status: 500 });
  }
}

// Optionnel : Forcer le recalcul (POST)
export async function POST() {
  try {
    const kpis = await getKPIs();
    await saveKpiHistory();
    
    return NextResponse.json({
      success: true,
      data: kpis,
      message: 'KPIs recalculés avec succès'
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Erreur lors du recalcul des KPIs'
    }, { status: 500 });
  }
}