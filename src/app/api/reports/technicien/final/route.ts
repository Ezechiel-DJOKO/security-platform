import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const plans = await prisma.planCorrection.findMany({
      where: {
        assigneA: session.user.id,
      },
      include: {
        vulnerabilite: {
          select: {
            titre: true,
            cveId: true,
            severite: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    const completed = plans.filter(p => p.statut === 'TERMINE');
    const total = plans.length;

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const { height } = page.getSize();

    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    let y = height - 80;

    // En-tête
    page.drawText("RAPPORT FINAL D'ACTIVITÉ", {
      x: 50,
      y,
      size: 26,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.6),
    });

    y -= 45;
    page.drawText(`Technicien : ${session.user.name || session.user.email}`, {
      x: 50,
      y,
      size: 14,
      font,
    });

    y -= 25;
    page.drawText(`Généré le : ${new Date().toLocaleDateString('fr-FR')}`, {
      x: 50,
      y,
      size: 12,
      font,
    });

    // Statistiques
    y -= 60;
    page.drawText("RÉSUMÉ DE VOTRE ACTIVITÉ", {
      x: 50,
      y,
      size: 18,
      font: boldFont,
    });

    y -= 40;
    page.drawText(`Tâches assignées : ${total}`, { x: 70, y, size: 13, font });
    y -= 28;
    page.drawText(`Tâches terminées : ${completed.length}`, { x: 70, y, size: 13, font });
    y -= 28;
    page.drawText(`Taux de réalisation : ${total > 0 ? Math.round((completed.length / total) * 100) : 0}%`, {
      x: 70,
      y,
      size: 13,
      font,
    });

    // Liste des corrections terminées
    y -= 55;
    page.drawText("CORRECTIONS TERMINÉES", {
      x: 50,
      y,
      size: 16,
      font: boldFont,
    });

    y -= 35;

    if (completed.length === 0) {
      page.drawText("Vous n'avez pas encore de correction terminée.", {
        x: 70,
        y,
        size: 12,
        font,
      });
    } else {
      for (const plan of completed.slice(0, 12)) {  // Limité à 12 pour éviter de déborder
        if (y < 100) break;

        const titre = plan.vulnerabilite.titre.length > 80 
          ? plan.vulnerabilite.titre.substring(0, 77) + '...' 
          : plan.vulnerabilite.titre;

        page.drawText(`• ${titre}`, {
          x: 70,
          y,
          size: 11,
          font,
        });
        y -= 22;
      }
    }

    const pdfBytes = await pdfDoc.save();

    // === FIX PRINCIPAL : Buffer ===
    const pdfBuffer = Buffer.from(pdfBytes);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Rapport_Final_Activite_${new Date().toISOString().slice(0,10)}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Erreur génération rapport final:', error);
    return NextResponse.json({
      error: "Erreur lors de la génération du rapport PDF"
    }, { status: 500 });
  }
}