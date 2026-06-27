import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  // ✅ prisma.utilisateur
  const utilisateur = await prisma.utilisateur.findUnique({
    where: { id: session.user.id },
    select: { role: true, nom: true, prenom: true }
  });

  if (utilisateur?.role !== 'AUDITEUR') {
    return NextResponse.json({ error: "Acces reserve aux auditeurs" }, { status: 403 });
  }

  try {
    const auditeurName = `${utilisateur.prenom || ''} ${utilisateur.nom || ''}`.trim()
      || session.user.email
      || 'Auditeur';

    const aujourdhui = new Date().toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric'
    });

    // ✅ Tous les plans avec les bonnes relations
    const plans = await prisma.planCorrection.findMany({
      include: {
        vulnerabilite: { select: { titre: true, scoreCVSS: true, severite: true } },
        assigne: { select: { nom: true, prenom: true, email: true } }
      },
      orderBy: { updatedAt: 'desc' }
    });

    // Statistiques
    const total    = plans.length;
    const termine  = plans.filter(p => p.statut === 'TERMINE').length;
    const enCours  = plans.filter(p => p.statut === 'EN_COURS').length;
    const enRetard = plans.filter(p => p.statut === 'EN_RETARD').length;
    const tauxRealisation = total > 0 ? Math.round((termine / total) * 100) : 0;

    // ── Génération PDF ──────────────────────────────────────

    const pdfDoc     = await PDFDocument.create();
    const page       = pdfDoc.addPage([595, 842]);
    const { height } = page.getSize();

    const boldFont   = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const font       = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    let y = height - 60;

    // Titre
    page.drawText("RAPPORT FINAL D'AUDITEUR", {
      x: 50, y, size: 26, font: boldFont, color: rgb(0.1, 0.1, 0.6),
    });
    y -= 8;
    page.drawLine({
      start: { x: 50, y }, end: { x: 545, y },
      thickness: 2, color: rgb(0.1, 0.1, 0.6)
    });

    y -= 40;
    page.drawText(`Auditeur : ${auditeurName}`, { x: 50, y, size: 14, font });
    y -= 22;
    page.drawText(`Date du rapport : ${aujourdhui}`, {
      x: 50, y, size: 12, font, color: rgb(0.3, 0.3, 0.3)
    });

    // Indicateurs
    y -= 50;
    page.drawText("INDICATEURS CLES", { x: 50, y, size: 18, font: boldFont });
    y -= 30;

    const drawCard = (
      cx: number, cy: number,
      label: string, value: string,
      r: number, g: number, b: number
    ) => {
      page.drawRectangle({
        x: cx, y: cy - 55, width: 230, height: 55,
        borderColor: rgb(0.8, 0.8, 0.8),
        borderWidth: 1,
        color: rgb(0.97, 0.97, 0.97)
      });
      page.drawText(value, {
        x: cx + 10, y: cy - 20, size: 28, font: boldFont, color: rgb(r, g, b)
      });
      page.drawText(label, {
        x: cx + 10, y: cy - 42, size: 11, font, color: rgb(0.4, 0.4, 0.4)
      });
    };

    drawCard(50,  y, 'Total assignations', String(total),    0.2, 0.2, 0.2);
    drawCard(295, y, 'Terminees',          String(termine),  0,   0.6, 0  );
    y -= 65;
    drawCard(50,  y, 'En cours',           String(enCours),  0.8, 0.6, 0  );
    drawCard(295, y, 'En retard',          String(enRetard), 0.8, 0,   0  );
    y -= 20;

    y -= 30;
    page.drawText(`Taux de realisation : ${tauxRealisation}%`, {
      x: 50, y, size: 14, font: boldFont, color: rgb(0, 0.4, 0)
    });

    // Tableau
    y -= 50;
    page.drawText("DETAIL DES ASSIGNATIONS", { x: 50, y, size: 18, font: boldFont });
    y -= 30;

    if (plans.length === 0) {
      page.drawText("Aucune assignation trouvee.", {
        x: 70, y, size: 12, font, color: rgb(0.5, 0.5, 0.5)
      });
    } else {
      const colX = [50, 130, 340, 450];
      ['#', 'Titre', 'Technicien', 'Statut'].forEach((h, i) => {
        page.drawText(h, {
          x: colX[i], y, size: 11, font: boldFont, color: rgb(0.1, 0.1, 0.1)
        });
      });
      y -= 12;
      page.drawLine({
        start: { x: 50, y }, end: { x: 545, y },
        thickness: 1, color: rgb(0.3, 0.3, 0.3)
      });
      y -= 15;

      const maxItems = Math.min(plans.length, 12);
      for (let i = 0; i < maxItems; i++) {
        const plan = plans[i];
        if (y < 120) break;

        const titre = (plan.vulnerabilite?.titre || 'Sans titre').substring(0, 28);
        const tech  = plan.assigne
          ? `${plan.assigne.prenom || ''} ${plan.assigne.nom || ''}`.trim() || plan.assigne.email
          : 'Non assigne';

        let sr = 0.2, sg = 0.2, sb = 0.2;
        let statutLabel = 'En cours';
        if (plan.statut === 'TERMINE')   { sr = 0;   sg = 0.6; sb = 0; statutLabel = 'Termine';   }
        if (plan.statut === 'EN_RETARD') { sr = 0.8; sg = 0;   sb = 0; statutLabel = 'En retard'; }

        page.drawText(`${i + 1}`,    { x: colX[0], y, size: 10, font });
        page.drawText(titre,         { x: colX[1], y, size: 10, font, color: rgb(0.2, 0.2, 0.2) });
        page.drawText(tech,          { x: colX[2], y, size: 10, font, color: rgb(0.2, 0.2, 0.2) });
        page.drawText(statutLabel,   { x: colX[3], y, size: 10, font: boldFont, color: rgb(sr, sg, sb) });

        y -= 18;
      }

      if (plans.length > maxItems) {
        page.drawText(`... et ${plans.length - maxItems} autre(s)`, {
          x: 70, y, size: 10, font, color: rgb(0.5, 0.5, 0.5)
        });
      }
    }

    // Conclusion
    y -= 50;
    page.drawText("CONCLUSION", { x: 50, y, size: 16, font: boldFont });
    y -= 28;
    page.drawText("Ce rapport synthetise les assignations durant la periode.", {
      x: 50, y, size: 12, font, color: rgb(0.3, 0.3, 0.3)
    });
    y -= 20;
    page.drawText("Signature :", { x: 50, y, size: 11, font: italicFont, color: rgb(0.4, 0.4, 0.4) });
    y -= 15;
    page.drawLine({
      start: { x: 50, y }, end: { x: 250, y },
      thickness: 1, color: rgb(0.3, 0.3, 0.3)
    });

    page.drawText(`Document genere le ${new Date().toISOString().slice(0, 10)}`, {
      x: 50, y: 30, size: 9, font, color: rgb(0.6, 0.6, 0.6)
    });

    const pdfBytes  = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Rapport_Final_Auditeur_${
          new Date().toISOString().slice(0, 10)
        }.pdf"`,
      },
    });

  } catch (error: any) {
    console.error("Erreur generation rapport final auditeur:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}