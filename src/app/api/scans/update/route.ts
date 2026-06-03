import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Severite } from "@prisma/client";  // ✅ AJOUTÉ : import de l'enum

interface VulnerabilityInput {
  cveId: string;
  titre: string;
  severite: string;
}

export async function POST(request: Request) {
  try {
    const { scanId, statut, duree, vulnerabilities } = await request.json();

    await prisma.scan.update({
      where: { id: scanId },
      data: { statut, duree: duree || undefined },
    });

    if (vulnerabilities && vulnerabilities.length > 0) {
      await prisma.vulnerabilite.createMany({
        data: (vulnerabilities as VulnerabilityInput[]).map((v) => ({
          idScan: scanId,
          cveId: v.cveId,
          titre: v.titre,
          severite: v.severite as Severite,  // ✅ CORRIGÉ : cast en enum Prisma
          statut: "OUVERTE",
        })),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue lors de la mise à jour du scan';
    console.error("Erreur API Bridge:", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}