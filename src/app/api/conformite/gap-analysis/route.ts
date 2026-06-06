// src/app/api/conformite/gap-analysis/route.ts
import { NextResponse } from 'next/server';
import { calculateGapAnalysis } from '@/lib/conformite/gapAnalysisService';

export async function GET() {
  try {
    const result = await calculateGapAnalysis();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Erreur Gap Analysis:", error);
    return NextResponse.json(
      { error: "Erreur lors du calcul de l'analyse de conformité" },
      { status: 500 }
    );
  }
}