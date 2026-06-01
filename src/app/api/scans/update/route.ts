import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { scanId, statut, duree, vulnerabilities } = await request.json();

    // 1. Mettre à jour le statut du scan
    await prisma.scan.update({
      where: { id: Number(scanId) },
      data: { statut, duree: duree || undefined },
    });

    // 2. Si des vulnérabilités sont trouvées, les insérer
    if (vulnerabilities && vulnerabilities.length > 0) {
      await prisma.vulnerabilite.createMany({
        data: vulnerabilities.map((v: any) => ({
          idScan: Number(scanId),
          cveId: v.cveId,
          titre: v.titre,
          severite: v.severite,
          statut: "OUVERTE",
        })),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Erreur API Bridge:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
