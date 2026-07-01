// src/app/api/reports/superviseur/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;

    const vuln = await prisma.vulnerabilite.findUnique({
      where: {
        id: id,
        statut: 'VERIFIEE'
      },
      include: {
        actif: true,
        assigne: true,                    // Assignation directe (si existe)
        plan: {
          include: { 
            assigne: true                   // ← Le technicien du plan
          }
        },
      }
    });

    if (!vuln) {
      return NextResponse.json({
        error: 'Vulnérabilité non trouvée ou non vérifiée'
      }, { status: 404 });
    }

    // Déterminer le technicien qui a corrigé (priorité au plan)
    let technicienCorrige = 'Non assigné';
    if (vuln.plan && vuln.plan.length > 0) {
      const plan = vuln.plan[0];
      if (plan.assigne) {
        technicienCorrige = `${plan.assigne.prenom} ${plan.assigne.nom}`;
      }
    } else if (vuln.assigne) {
      technicienCorrige = `${vuln.assigne.prenom} ${vuln.assigne.nom}`;
    }

    // === Génération PDF ===
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const page = pdfDoc.addPage([595, 842]);
    let y = 720;

    page.drawText("RAPPORT INDIVIDUEL - VULNÉRABILITÉ VÉRIFIÉE", {
      x: 50, y, size: 20, font: bold, color: rgb(0.1, 0.4, 0.8)
    });
    y -= 50;

    page.drawText(vuln.titre, { x: 50, y, size: 15, font: bold });
    y -= 40;

    page.drawText(`Actif : ${vuln.actif?.nom || '—'}`, { x: 50, y, size: 12, font });
    y -= 25;

    page.drawText(`Sévérité : ${vuln.severite}`, { x: 50, y, size: 12, font });
    y -= 25;

    // Technicien mis en évidence
    page.drawText(`Corrigé par : ${technicienCorrige}`, { 
      x: 50, y, size: 13, font: bold, color: rgb(0.1, 0.7, 0.3) 
    });
    y -= 30;

    page.drawText(`Vérifié le : ${vuln.dateCorrection ? new Date(vuln.dateCorrection).toLocaleDateString('fr-FR') : 'N/A'}`, { 
      x: 50, y, size: 12, font 
    });

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="rapport-vuln-${id}.pdf"`,
      },
    });

  } catch (error: any) {
    console.error("Erreur génération rapport individuel:", error);
    return NextResponse.json({ error: 'Erreur lors de la génération du rapport' }, { status: 500 });
  }
}