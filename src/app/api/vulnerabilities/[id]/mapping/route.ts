// src/app/api/vulnerabilities/[id]/mapping/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { applyAutoMapping } from '@/lib/mapping/vulnerabilityMappingService';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const vulnerabiliteId = params.id;

    // Vérifier que la vulnérabilité existe
    const vuln = await prisma.vulnerabilite.findUnique({
      where: { id: vulnerabiliteId },
    });

    if (!vuln) {
      return NextResponse.json(
        { error: "Vulnérabilité non trouvée" },
        { status: 404 }
      );
    }

    // Appliquer le mapping automatique
    const result = await applyAutoMapping(vulnerabiliteId);

    return NextResponse.json({
      success: true,
      message: `Mapping automatique terminé pour la vulnérabilité`,
      data: result,
    });

  } catch (error: any) {
    console.error("Erreur lors du mapping automatique :", error);
    return NextResponse.json(
      { 
        error: "Erreur lors de l'application du mapping",
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// Optionnel : GET pour récupérer les contrôles déjà liés à une vulnérabilité
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const vulnerabiliteId = params.id;

    const mappings = await prisma.vulnerabiliteControl.findMany({
      where: { vulnerabiliteId },
      include: {
        controle: true,
      },
      orderBy: {
        niveauPertinence: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: mappings,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erreur lors de la récupération des mappings" },
      { status: 500 }
    );
  }
}