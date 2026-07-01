// src/app/api/reports/plan/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from 'pdf-lib';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id: planId } = await params;

    const plan = await prisma.planCorrection.findUnique({
      where: { id: planId },
      include: {
        vulnerabilite: {
          include: { actif: true }
        },
        assigne: { select: { nom: true, prenom: true, email: true } },
        createur: { select: { nom: true, prenom: true, email: true } },
      },
    });

    if (!plan) {
      return NextResponse.json({ error: 'Plan non trouvé' }, { status: 404 });
    }

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const { width } = page.getSize();
    const margin = 50;
    const maxWidth = width - margin * 2;

    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    let y = 780;

    page.drawText("RAPPORT INDIVIDUEL - VULNÉRABILITÉ VÉRIFIÉE", {
      x: margin,
      y,
      size: 20,
      font: boldFont,
      color: rgb(0.1, 0.4, 0.8),
    });
    y -= 50;

    page.drawText(plan.vulnerabilite.titre, { x: margin, y, size: 14, font: boldFont });
    y -= 40;

    page.drawText(`Actif : ${plan.vulnerabilite.actif?.nom || '—'}`, { x: margin, y, size: 12, font });
    y -= 25;

    page.drawText(`Sévérité : ${plan.vulnerabilite.severite}`, { x: margin, y, size: 12, font });
    y -= 25;

    const technicien = plan.assigne 
      ? `${plan.assigne.prenom || ''} ${plan.assigne.nom || ''}`.trim() 
      : 'Non assigné';

    page.drawText(`Corrigé par : ${technicien}`, { 
      x: margin, y, size: 13, font: boldFont, color: rgb(0.1, 0.7, 0.3) 
    });
    y -= 30;

    const auditeur = plan.createur 
      ? `${plan.createur.prenom || ''} ${plan.createur.nom || ''}`.trim() 
      : 'Auditeur Inconnu';

    page.drawText(`Vérifié par l'Auditeur : ${auditeur}`, { 
      x: margin, y, size: 12, font 
    });
    y -= 25;

    page.drawText(`Vérifié le : ${plan.dateResolution ? new Date(plan.dateResolution).toLocaleDateString('fr-FR') : 'N/A'}`, { 
      x: margin, y, size: 12, font 
    });

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Rapport_Vuln_${plan.vulnerabilite.titre.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)}.pdf"`,
      },
    });

  } catch (error: any) {
    console.error('Erreur génération rapport individuel:', error);
    return NextResponse.json({ error: 'Erreur lors de la génération du rapport' }, { status: 500 });
  }
}