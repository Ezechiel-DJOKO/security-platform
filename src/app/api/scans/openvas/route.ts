// src/app/api/scans/openvas/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { exec } from 'child_process';
import { promisify } from 'util';

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

    const targetIp = target || actif.adresseIP;
    if (!targetIp) return NextResponse.json({ error: "Aucune IP valide" }, { status: 400 });

    // Exécuter le script Python
    const { stdout } = await execPromise(`cd python-scanner && python3 scan.py ${targetIp}`);

    const result = JSON.parse(stdout);

    // Enregistrer le scan dans Prisma
    const scan = await prisma.scan.create({
      data: {
        idActif,
        lancerPar: session.user.id,
        type: 'VULNERABILITE',
        outil: 'OPENVAS',
        statut: 'EN_COURS',
      }
    });

    return NextResponse.json({
      message: "Scan OpenVAS lancé",
      scanId: scan.id,
      openvas: result
    });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}