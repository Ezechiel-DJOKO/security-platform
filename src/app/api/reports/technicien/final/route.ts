import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const plans = await prisma.planCorrection.findMany({
      where: { assigneA: session.user.id },
      include: {
        vulnerabilite: { select: { titre: true, cveId: true, severite: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const completed = plans.filter((p) => p.statut === 'TERMINE');
    const enCours = plans.filter((p) => p.statut === 'EN_COURS');
    const total = plans.length;

    // Stats par sévérité sur les corrections terminées
    const parSeverite = completed.reduce((acc, p) => {
      const s = p.vulnerabilite.severite;
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([595, 842]);
    const { height } = page.getSize();
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    let y = height - 80;

    page.drawText("RAPPORT FINAL D'ACTIVITE", {
      x: 50, y, size: 26, font: boldFont, color: rgb(0.1, 0.1, 0.6),
    });

    y -= 45;
    page.drawText(`Technicien : ${session.user.name || session.user.email}`, { x: 50, y, size: 14, font });
    y -= 25;
    page.drawText(`Genere le : ${new Date().toLocaleDateString('fr-FR')}`, { x: 50, y, size: 12, font });

    // Statistiques
    y -= 55;
    page.drawText("RESUME DE VOTRE ACTIVITE", { x: 50, y, size: 18, font: boldFont });
    y -= 38;
    page.drawText(`Taches assignees : ${total}`, { x: 70, y, size: 13, font });
    y -= 26;
    page.drawText(`Taches terminees : ${completed.length}`, { x: 70, y, size: 13, font });
    y -= 26;
    page.drawText(`Taches en cours : ${enCours.length}`, { x: 70, y, size: 13, font });
    y -= 26;
    const taux = total > 0 ? Math.round((completed.length / total) * 100) : 0;
    page.drawText(`Taux de realisation : ${taux}%`, { x: 70, y, size: 13, font });

    // Répartition par sévérité
    y -= 45;
    page.drawText("CORRECTIONS PAR SEVERITE", { x: 50, y, size: 16, font: boldFont });
    y -= 30;
    (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).forEach((sev) => {
      page.drawText(`${sev} : ${parSeverite[sev] || 0}`, { x: 70, y, size: 12, font });
      y -= 24;
    });

    // Liste des corrections terminées
    y -= 25;
    page.drawText("CORRECTIONS TERMINEES", { x: 50, y, size: 16, font: boldFont });
    y -= 32;

    if (completed.length === 0) {
      page.drawText("Vous n'avez pas encore de correction terminee.", { x: 70, y, size: 12, font });
    } else {
      for (const plan of completed) {
        // Nouvelle page si on déborde
        if (y < 80) {
          page = pdfDoc.addPage([595, 842]);
          y = height - 80;
        }
        const titre = plan.vulnerabilite.titre.length > 75
          ? plan.vulnerabilite.titre.substring(0, 72) + '...'
          : plan.vulnerabilite.titre;
        const cve = plan.vulnerabilite.cveId ? ` [${plan.vulnerabilite.cveId}]` : '';
        page.drawText(`- ${titre}${cve}`, { x: 70, y, size: 11, font });
        y -= 22;
      }
    }

    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Rapport_Final_Activite_${new Date().toISOString().slice(0, 10)}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Erreur génération rapport final:', error);
    return NextResponse.json({ error: 'Erreur lors de la génération du rapport PDF' }, { status: 500 });
  }
}