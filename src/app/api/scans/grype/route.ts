// src/app/api/scans/grype/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { exec } from 'child_process';
import { promisify } from 'util';
import { OutilScan } from '@prisma/client';

const execPromise = promisify(exec);

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { imageName, idActif } = await req.json();   

  if (!imageName) {
    return NextResponse.json({ error: "Le nom de l'image (imageName) est requis" }, { status: 400 });
  }

  if (!idActif) {
    return NextResponse.json({ error: "L'identifiant de l'actif (idActif) est requis" }, { status: 400 });
  }

  try {
    const actif = await prisma.actif.findUnique({ where: { id: idActif } });
    if (!actif) {
      return NextResponse.json({ error: "Actif non trouvé" }, { status: 404 });
    }

    const { stdout } = await execPromise(`grype ${imageName} -f json`);
    const result = JSON.parse(stdout);

    const scan = await prisma.scan.create({
      data: {
        idActif: idActif,
        lancerPar: session.user.id,
        type: "VULNERABILITE",
        outil: OutilScan.GRYPE, 
        statut: "TERMINE",
        fin: new Date(),
      }
    });

    return NextResponse.json({
      message: "Scan Grype terminé",
      scanId: scan.id,
      vulnerabilities: result.vulnerabilities?.length || 0,
      summary: result
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue lors du scan Grype';
    console.error("Erreur Scan Grype:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}