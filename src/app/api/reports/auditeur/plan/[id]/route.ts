import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from 'pdf-lib';

// ─── Nettoyage du texte (supprime les emojis et caractères non supportés) ───
function sanitizeText(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    .replace(/[^\x00-\xFF]/g, '')
    .trim();
}

function drawWrappedText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  maxWidth: number,
  color = rgb(0.15, 0.15, 0.15),
  lineHeight = 15
): number {
  if (!text) return y;
  const paragraphs = text.split('\n');
  let currentY = y;

  for (const paragraph of paragraphs) {
    const words = paragraph.split(' ');
    let line = '';

    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(testLine, size) > maxWidth && line !== '') {
        page.drawText(line, { x, y: currentY, size, font, color });
        line = word;
        currentY -= lineHeight;
      } else {
        line = testLine;
      }
    }
    if (line) {
      page.drawText(line, { x, y: currentY, size, font, color });
      currentY -= lineHeight;
    }
  }
  return currentY - 5;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const utilisateur = await prisma.utilisateur.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (utilisateur?.role !== 'AUDITEUR') {
    return NextResponse.json({ error: 'Accès réservé aux auditeurs' }, { status: 403 });
  }

  const { id: planId } = await params;

  try {
    const plan = await prisma.planCorrection.findUnique({
      where: { id: planId },
      include: {
        vulnerabilite: true,
        assigne: { select: { nom: true, prenom: true, email: true } },
        createur: { select: { nom: true, prenom: true, email: true } }, // ← Ajouté
      },
    });

    if (!plan) {
      return NextResponse.json({ error: 'Plan non trouvé' }, { status: 404 });
    }

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const { height, width } = page.getSize();
    const margin = 50;
    const maxWidth = width - margin * 2;

    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    let y = height - 70;

    // Header
    page.drawText("RAPPORT D'ASSIGNATION", {
      x: margin,
      y,
      size: 26,
      font: boldFont,
      color: rgb(0.05, 0.15, 0.55),
    });
    y -= 25;
    page.drawRectangle({
      x: margin,
      y: y + 5,
      width: maxWidth,
      height: 3,
      color: rgb(0.05, 0.15, 0.55),
    });
    y -= 35;

    page.drawText(`Auditeur : ${session.user.name || session.user.email}`, {
      x: margin,
      y,
      size: 13,
      font,
    });
    y -= 20;
    page.drawText(`Généré le : ${new Date().toLocaleDateString('fr-FR')}`, {
      x: margin,
      y,
      size: 12,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });

    // Statut
    y -= 35;
    const statutColors: Record<string, ReturnType<typeof rgb>> = {
      TERMINE: rgb(0.0, 0.55, 0.2),
      EN_RETARD: rgb(0.85, 0.1, 0.1),
      EN_COURS: rgb(0.9, 0.55, 0.0),
      VERIFIE: rgb(0.0, 0.4, 0.8),
    };
    const statutColor = statutColors[plan.statut] || rgb(0.4, 0.4, 0.4);

    page.drawText(`Statut : ${plan.statut}`, {
      x: margin,
      y,
      size: 14,
      font: boldFont,
      color: statutColor,
    });

    y -= 45;

    // Section Vulnérabilité
    page.drawText('VULNÉRABILITÉ ASSIGNÉE', {
      x: margin,
      y,
      size: 16,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= 22;

    const drawField = (label: string, value: string | null | undefined) => {
      page.drawText(label, { x: margin, y, size: 11, font: boldFont, color: rgb(0.45, 0.45, 0.45) });
      y = drawWrappedText(page, value || '—', margin + 160, y, font, 11, maxWidth - 170);
      y -= 8;
    };

    drawField('Titre :', plan.vulnerabilite.titre);
    drawField('CVE :', plan.vulnerabilite.cveId);
    drawField('Sévérité :', plan.vulnerabilite.severite);
    drawField('Score CVSS :', plan.vulnerabilite.scoreCVSS?.toFixed(1));
    drawField('Priorité :', plan.priorite);
    drawField('Échéance :', new Date(plan.dateEcheance).toLocaleDateString('fr-FR'));

    const technicien = plan.assigne
      ? `${plan.assigne.prenom || ''} ${plan.assigne.nom || ''}`.trim() || plan.assigne.email
      : 'Non assigné';

    const assignateur = plan.createur
      ? `${plan.createur.prenom || ''} ${plan.createur.nom || ''}`.trim() || plan.createur.email
      : 'Inconnu';

    drawField('Assigné à :', technicien);
    drawField('Assigné par :', assignateur);

    if (plan.dateResolution) {
      drawField('Résolu le :', new Date(plan.dateResolution).toLocaleDateString('fr-FR'));
    }

    y -= 25;

    // Section Commentaire (corrigé)
    page.drawText('COMMENTAIRE D\'ASSIGNATION', {
      x: margin,
      y,
      size: 16,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= 25;

    const cleanComment = sanitizeText(plan.commentaire);

    if (cleanComment) {
      page.drawText(`Commentaire laissé par ${assignateur} :`, {
        x: margin,
        y,
        size: 12,
        font: boldFont,
        color: rgb(0.3, 0.5, 0.8),
      });
      y -= 22;
      y = drawWrappedText(page, cleanComment, margin, y, font, 10.5, maxWidth);
    } else {
      page.drawText('Aucun commentaire n\'a été laissé lors de l\'assignation.', {
        x: margin,
        y,
        size: 11,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
    }

    // Footer
    page.drawText(
      `Document généré le ${new Date().toLocaleDateString('fr-FR')} • Security Platform`,
      { x: margin, y: 35, size: 9, font, color: rgb(0.5, 0.5, 0.5) }
    );

    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Assignation_${plan.vulnerabilite.titre
          .replace(/[^a-zA-Z0-9]/g, '_')
          .substring(0, 40)}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Erreur génération rapport assignation:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération du rapport PDF' },
      { status: 500 }
    );
  }
}