import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id: planId } = await params;

  if (!planId) {
    return NextResponse.json({ error: "ID du plan manquant" }, { status: 400 });
  }

  try {
    const plan = await prisma.planCorrection.findUnique({
      where: {
        id: planId,
        auditeurId: session.user.id,
      },
      include: {
        vulnerabilite: true,
        assigne: true,
      },
    });

    if (!plan) {
      return NextResponse.json({ error: "Assignation non trouvée ou non autorisée" }, { status: 404 });
    }

    if (plan.statut !== 'TERMINE') {
      return NextResponse.json({ error: "Cette correction n'est pas encore terminée" }, { status: 400 });
    }

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const { height } = page.getSize();

    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    let y = height - 80;

    // En-tête
    page.drawText("RAPPORT D'ASSIGNATION", {
      x: 50,
      y,
      size: 24,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.6),
    });

    y -= 40;
    page.drawText(`Auditeur : ${session.user.name || session.user.email}`, {
      x: 50,
      y,
      size: 13,
      font,
    });

    y -= 25;
    page.drawText(`Date du rapport : ${new Date().toLocaleDateString('fr-FR')}`, {
      x: 50,
      y,
      size: 12,
      font,
    });

    // Vulnérabilité
    y -= 50;
    page.drawText("VULNÉRABILITÉ ASSIGNÉE", {
      x: 50,
      y,
      size: 16,
      font: boldFont,
    });

    y -= 35;
    page.drawText(`Titre : ${plan.vulnerabilite.titre}`, {
      x: 70,
      y,
      size: 12,
      font,
    });

    y -= 25;

    if (plan.vulnerabilite.cveId) {
      page.drawText(`CVE : ${plan.vulnerabilite.cveId}`, { x: 70, y, size: 12, font });
      y -= 25;
    }

    page.drawText(`Sévérité : ${plan.vulnerabilite.severite}`, { x: 70, y, size: 12, font });
    y -= 25;

    // Technicien assigné (correction nom/prenom)
    const technicienName = plan.assigne 
      ? `${plan.assigne.prenom || ''} ${plan.assigne.nom || ''}`.trim() || plan.assigne.email 
      : 'N/A';

    page.drawText(`Technicien assigné : ${technicienName}`, {
      x: 70,
      y,
      size: 12,
      font,
    });

    y -= 25;
    page.drawText(`Date d'échéance : ${new Date(plan.dateEcheance).toLocaleDateString('fr-FR')}`, {
      x: 70,
      y,
      size: 12,
      font,
    });

    if (plan.dateResolution) {
      y -= 25;
      page.drawText(`Date de résolution : ${new Date(plan.dateResolution).toLocaleDateString('fr-FR')}`, {
        x: 70,
        y,
        size: 12,
        font,
      });
    }

    // Résultat
    y -= 45;
    page.drawText("RÉSULTAT DE LA CORRECTION", {
      x: 50,
      y,
      size: 16,
      font: boldFont,
    });

    y -= 35;

    if (plan.commentaire) {
      page.drawText("Commentaire du technicien :", {
        x: 70,
        y,
        size: 12,
        font: boldFont,
      });
      y -= 25;

      const lines = plan.commentaire.split('\n');
      for (const line of lines) {
        if (y < 100) break;
        page.drawText(line.trim(), { x: 85, y, size: 11, font });
        y -= 18;
      }
    }

    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Assignation_${plan.vulnerabilite.titre
          .replace(/[^a-zA-Z0-9]/g, '_')
          .substring(0, 30)}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Erreur génération rapport assignation:", error);
    return NextResponse.json({ error: "Erreur lors de la génération du rapport" }, { status: 500 });
  }
}