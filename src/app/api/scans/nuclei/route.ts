// src/app/api/scans/nuclei/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
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

  const { idActif, target } = await req.json();

  try {
    const actif = await prisma.actif.findUnique({ where: { id: idActif } });
    if (!actif) return NextResponse.json({ error: "Actif non trouvé" }, { status: 404 });

    const scanTarget = target || actif.adresseIP || actif.hostname;
    if (!scanTarget) return NextResponse.json({ error: "Aucune cible valide" }, { status: 400 });

    // Exécution Nuclei
    const command = `nuclei -target ${scanTarget} -json -silent -o nuclei-output.json`;
    const { stdout } = await execPromise(command);

    const scan = await prisma.scan.create({
      data: {
        // ✅ Correction 1 : Sécurise le type au cas où 'idActif' reçu du JSON vaut null
        idActif: idActif ?? undefined,
        lancerPar: session.user.id,
        type: "VULNERABILITE",
        // ✅ Correction 2 : Utilise l'Enum typé importé depuis Prisma Client
        outil: OutilScan.NUCLEI, 
        statut: "TERMINE",
        fin: new Date(),
      }
    });

    return NextResponse.json({
      message: "Scan Nuclei terminé",
      scanId: scan.id,
      findings: stdout ? "Résultats disponibles" : "Aucune vulnérabilité détectée"
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
