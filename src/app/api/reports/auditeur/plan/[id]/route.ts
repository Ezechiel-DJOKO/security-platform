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
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  // ✅ prisma.utilisateur
  const utilisateur = await prisma.utilisateur.findUnique({
    where: { id: session.user.id },
    select: { role: true }
  });

  if (utilisateur?.role !== 'AUDITEUR') {
    return NextResponse.json({ error: "Acces reserve aux auditeurs" }, { status: 403 });
  }

  const { id: planId } = await params;

  if (!planId) {
    return NextResponse.json({ error: "ID du plan manquant" }, { status: 400 });
  }

  try {
    // ✅ Pas de auditeurId → on cherche juste par id
    const plan = await prisma.planCorrection.findUnique({
      where: { id: planId },
      include: {
        vulnerabilite: true,
        // ✅ relation "assigne" (PlanAssigneA)
        assigne: {
          select: {
            nom: true,
            prenom: true,
            email: true
          }
        },
      },
    });

    if (!plan) {
      return NextResponse.json({ error: "Plan non trouve" }, { status: 404 });
    }

    // ── Génération PDF ──────────────────────────────────────

    const pdfDoc   = await PDFDocument.create();
    const page     = pdfDoc.addPage([595, 842]);
    const { height } = page.getSize();

    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const font     = await pdfDoc.embedFont(StandardFonts.Helvetica);

    let y = height - 80;

    // En-tete
    page.drawText("RAPPORT D'ASSIGNATION", {
      x: 50, y, size: 24, font: boldFont, color: rgb(0.1, 0.1, 0.6),
    });
    y -= 8;
    page.drawLine({
      start: { x: 50, y }, end: { x: 545, y },
      thickness: 2, color: rgb(0.1, 0.1, 0.6)
    });

    y -= 35;
    page.drawText(`Auditeur : ${session.user.name || session.user.email}`, {
      x: 50, y, size: 13, font,
    });
    y -= 22;
    page.drawText(`Date du rapport : ${new Date().toLocaleDateString('fr-FR')}`, {
      x: 50, y, size: 12, font, color: rgb(0.3, 0.3, 0.3)
    });

    // Statut avec couleur
    y -= 30;
    let sr = 0.8, sg = 0.6, sb = 0.0;
    let statutLabel = 'En cours';
    if (plan.statut === 'TERMINE')   { sr = 0;   sg = 0.6; sb = 0;   statutLabel = 'Termine';   }
    if (plan.statut === 'EN_RETARD') { sr = 0.8; sg = 0;   sb = 0;   statutLabel = 'En retard'; }
    if (plan.statut === 'ANNULE')    { sr = 0.5; sg = 0.5; sb = 0.5; statutLabel = 'Annule';    }
    if (plan.statut === 'VERIFIE')   { sr = 0;   sg = 0.4; sb = 0.8; statutLabel = 'Verifie';   }

    page.drawText(`Statut : ${statutLabel}`, {
      x: 50, y, size: 14, font: boldFont, color: rgb(sr, sg, sb)
    });

    // Vulnerabilite
    y -= 45;
    page.drawText("VULNERABILITE ASSIGNEE", {
      x: 50, y, size: 16, font: boldFont,
    });
    y -= 8;
    page.drawLine({
      start: { x: 50, y }, end: { x: 545, y },
      thickness: 1, color: rgb(0.8, 0.8, 0.8)
    });

    y -= 28;
    page.drawText(`Titre : ${plan.vulnerabilite.titre}`, {
      x: 70, y, size: 12, font,
    });
    y -= 22;

    if (plan.vulnerabilite.cveId) {
      page.drawText(`CVE : ${plan.vulnerabilite.cveId}`, { x: 70, y, size: 12, font });
      y -= 22;
    }

    page.drawText(`Severite : ${plan.vulnerabilite.severite}`, {
      x: 70, y, size: 12, font
    });
    y -= 22;

    if (plan.vulnerabilite.scoreCVSS) {
      page.drawText(`Score CVSS : ${plan.vulnerabilite.scoreCVSS}`, {
        x: 70, y, size: 12, font
      });
      y -= 22;
    }

    // Technicien
    const technicienName = plan.assigne 
      ? `${plan.assigne.prenom || ''} ${plan.assigne.nom || ''}`.trim() || plan.assigne.email 
      : 'Non assigne';

    page.drawText(`Technicien assigne : ${technicienName}`, {
      x: 70, y, size: 12, font,
    });
    y -= 22;

    page.drawText(
      `Priorite : ${plan.priorite}`,
      { x: 70, y, size: 12, font }
    );
    y -= 22;

    page.drawText(
      `Date d echeance : ${new Date(plan.dateEcheance).toLocaleDateString('fr-FR')}`,
      { x: 70, y, size: 12, font }
    );

    if (plan.dateResolution) {
      y -= 22;
      page.drawText(
        `Date de resolution : ${new Date(plan.dateResolution).toLocaleDateString('fr-FR')}`,
        { x: 70, y, size: 12, font }
      );
    }

    // Resultat
    y -= 45;
    page.drawText("RESULTAT DE LA CORRECTION", {
      x: 50, y, size: 16, font: boldFont,
    });
    y -= 8;
    page.drawLine({
      start: { x: 50, y }, end: { x: 545, y },
      thickness: 1, color: rgb(0.8, 0.8, 0.8)
    });
    y -= 28;

    if (plan.commentaire) {
      page.drawText("Commentaire du technicien :", {
        x: 70, y, size: 12, font: boldFont,
      });
      y -= 22;

      const lines = plan.commentaire.split('\n');
      for (const line of lines) {
        if (y < 100) break;
        page.drawText(line.trim(), { x: 85, y, size: 11, font, color: rgb(0.2, 0.2, 0.2) });
        y -= 18;
      }
    } else {
      page.drawText("Aucun commentaire.", {
        x: 70, y, size: 11, font, color: rgb(0.5, 0.5, 0.5)
      });
    }

    // Pied de page
    page.drawText(
      `Document genere le ${new Date().toISOString().slice(0, 10)}`,
      { x: 50, y: 30, size: 9, font, color: rgb(0.6, 0.6, 0.6) }
    );

    const pdfBytes  = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Assignation_${
          plan.vulnerabilite.titre.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)
        }.pdf"`,
      },
    });

  } catch (error: any) {
    console.error("Erreur generation rapport assignation:", error);
    return NextResponse.json({ error: "Erreur lors de la generation du rapport" }, { status: 500 });
  }
}