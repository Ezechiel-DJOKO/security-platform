import { NextResponse } from 'next/server';
import { lancerScanAction } from '@/features/scans/actions';
import { TypeScan, OutilScan } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Récupérer ou créer un actif de test
    let actif = await prisma.actif.findFirst();
    if (!actif) {
      actif = await prisma.actif.create({
        data: {
          nom: "Serveur Test Auto",
          adresseIP: "192.168.10.50",
          hostname: "test-server.local",
          type: "SERVEUR",
          criticite: "ELEVE",
        }
      });
    }

    // Récupérer ou créer un utilisateur de test
    let user = await prisma.utilisateur.findFirst();
    if (!user) {
      user = await prisma.utilisateur.create({
        data: {
          nom: "Admin",
          prenom: "Test",
          email: "admin@test.com",
          motDePasseHashe: "$2b$10$test123456789",
          role: "AUDITEUR",
        }
      });
    }

    const result = await lancerScanAction({
      idActif: actif.id,
      userId: user.id,
      type: TypeScan.VULNERABILITE,
      outil: OutilScan.NUCLEI,
      cible: "https://example.com"
    });

    return NextResponse.json({
      success: true,
      message: "Test de scan lancé",
      scan: result
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
