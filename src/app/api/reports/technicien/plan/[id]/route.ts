import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from 'pdf-lib';

const SEVERITE_CONFIG: Record<string, { label: string; color: ReturnType<typeof rgb> }> = {
  CRITICAL: { label: 'CRITIQUE', color: rgb(0.75, 0.05, 0.05) },
  HIGH: { label: 'ÉLEVÉE', color: rgb(0.85, 0.35, 0.0) },
  MEDIUM: { label: 'MOYENNE', color: rgb(0.85, 0.65, 0.0) },
  LOW: { label: 'FAIBLE', color: rgb(0.0, 0.55, 0.25) },
};

const STATUT_CONFIG: Record<string, { label: string; color: ReturnType<typeof rgb> }> = {
  TERMINE: { label: 'TERMINÉ', color: rgb(0.0, 0.55, 0.25) },
  EN_COURS: { label: 'EN COURS', color: rgb(0.85, 0.55, 0.0) },
  A_FAIRE: { label: 'À FAIRE', color: rgb(0.6, 0.6, 0.6) },
  EN_RETARD: { label: 'EN RETARD', color: rgb(0.8, 0.1, 0.1) },
  VERIFIE: { label: 'VÉRIFIÉ', color: rgb(0.0, 0.6, 0.4) },
};

// Fonction améliorée pour gérer les caractères spéciaux
function drawWrappedText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  maxWidth: number,
  color = rgb(0.15, 0.15, 0.15),
  lineHeight = 14
): number {
  if (!text) return y;

  // Remplacer les emojis et caractères spéciaux problématiques
  const cleanText = text
    .replace(/⚡/g, '•')   // Remplacer l'éclair
    .replace(/[^\x00-\xFF]/g, ''); // Supprimer les autres caractères non WinAnsi

  const paragraphs = cleanText.split('\n');
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

  return currentY - 4;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;

    const plan = await prisma.planCorrection.findFirst({
      where: { id },
      include: {
        vulnerabilite: {
          include: {
            actif: {
              select: { nom: true, adresseIP: true, hostname: true }
            },
          },
        },
        assigne: {
          select: { prenom: true, nom: true }
        },
      },
    });

    if (!plan) {
      return NextResponse.json({ error: 'Plan introuvable' }, { status: 404 });
    }

    const v = plan.vulnerabilite;
    const sev = SEVERITE_CONFIG[v.severite] || { label: v.severite, color: rgb(0.3, 0.3, 0.3) };
    const planStatut = STATUT_CONFIG[plan.statut] || { label: plan.statut, color: rgb(0.3, 0.3, 0.3) };

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const { width, height } = page.getSize();
    const margin = 50;
    const maxWidth = width - margin * 2;

    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    let y = height - 65;

    // Header
    page.drawText('RAPPORT DE CORRECTION', {
      x: margin,
      y,
      size: 26,
      font: bold,
      color: rgb(0.05, 0.15, 0.55),
    });
    y -= 22;

    page.drawRectangle({
      x: margin,
      y: y + 8,
      width: maxWidth,
      height: 3,
      color: rgb(0.05, 0.15, 0.55),
    });
    y -= 45;

    // Badge Statut
    const statutText = `STATUT : ${planStatut.label}`;
    page.drawText(statutText, {
      x: margin,
      y,
      size: 13,
      font: bold,
      color: planStatut.color,
    });
    y -= 38;

    // Section Vulnérabilité
    page.drawText('VULNÉRABILITÉ', { x: margin, y, size: 15, font: bold, color: rgb(0.1, 0.1, 0.1) });
    y -= 22;

    const drawField = (label: string, value: string | null | undefined, color = rgb(0.15, 0.15, 0.15)) => {
      page.drawText(label, { x: margin, y, size: 11, font: bold, color: rgb(0.4, 0.4, 0.4) });
      y = drawWrappedText(page, value || '—', margin + 140, y, font, 11, maxWidth - 150, color);
      y -= 10;
    };

    drawField('Titre :', v.titre);
    drawField('CVE :', v.cveId);
    drawField('Sévérité :', sev.label, sev.color);
    drawField('Score CVSS :', v.scoreCVSS?.toFixed(1) || null);

    if (v.actif) {
      const actifInfo = `${v.actif.nom}${v.actif.adresseIP ? ` (${v.actif.adresseIP})` : ''}`;
      drawField('Actif cible :', actifInfo);
    }

    drawField('Découverte le :', new Date(v.dateDecouverte).toLocaleDateString('fr-FR'));
    y -= 15;

    // Description
    page.drawText('DESCRIPTION', { x: margin, y, size: 14, font: bold });
    y -= 18;
    y = drawWrappedText(page, v.description || 'Aucune description disponible.', margin, y, font, 10.5, maxWidth);
    y -= 18;

    // Recommandation
    page.drawText('RECOMMANDATION', { x: margin, y, size: 14, font: bold, color: rgb(0.0, 0.5, 0.2) });
    y -= 18;
    y = drawWrappedText(page, v.recommandation || 'Aucune recommandation enregistrée.', margin, y, font, 10.5, maxWidth, rgb(0.1, 0.4, 0.1));
    y -= 25;

    // Détails de la correction
    page.drawText('DÉTAILS DE LA CORRECTION', { x: margin, y, size: 14, font: bold });
    y -= 22;

    drawField('Priorité :', plan.priorite);
    drawField('Statut du plan :', planStatut.label, planStatut.color);
    drawField('Échéance :', new Date(plan.dateEcheance).toLocaleDateString('fr-FR'));

    if (plan.dateResolution) {
      drawField('Résolu le :', new Date(plan.dateResolution).toLocaleDateString('fr-FR'));
    }

    drawField('Technicien :', `${plan.assigne?.prenom || ''} ${plan.assigne?.nom || ''}`.trim() || '—');

    if (plan.commentaire) {
      y -= 10;
      page.drawText('COMMENTAIRE DU TECHNICIEN', { x: margin, y, size: 12, font: bold });
      y -= 16;
      y = drawWrappedText(page, plan.commentaire, margin, y, font, 10, maxWidth);
    }

    // Footer
    page.drawText(
      `Généré le ${new Date().toLocaleDateString('fr-FR')} • Security Platform`,
      { x: margin, y: 35, size: 9, font, color: rgb(0.5, 0.5, 0.5) }
    );

    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Correction_${v.titre.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`,
      },
    });

  } catch (error: any) {
    console.error('Erreur génération PDF:', error);
    return NextResponse.json({ error: 'Erreur lors de la génération du PDF' }, { status: 500 });
  }
}