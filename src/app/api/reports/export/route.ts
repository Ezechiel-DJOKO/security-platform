import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    const periode = searchParams.get('periode') || 'mois';

    const now = new Date();
    let dateDebut = new Date();
    if (periode === 'mois') dateDebut.setMonth(now.getMonth() - 1);
    else if (periode === 'trimestre') dateDebut.setMonth(now.getMonth() - 3);
    else if (periode === 'annee') dateDebut.setFullYear(now.getFullYear() - 1);

    const vulnerabilites = await prisma.vulnerabilite.findMany({
      where: {
        deletedAt: null,
        createdAt: { gte: dateDebut, lte: now }
      },
      include: {
        plan: true        // Relation correcte
      },
      orderBy: { updatedAt: 'desc' }
    });

    // ==================== JSON ====================
    if (format === 'json') {
      return NextResponse.json({
        success: true,
        periode,
        total: vulnerabilites.length,
        data: vulnerabilites
      });
    }

    // ==================== XLSX ====================
    if (format === 'xlsx') {
      const data = vulnerabilites.map((v: any) => {
        const plan = v.plan?.[0]; // Prendre le premier plan (car one-to-many)
        return {
          Titre: v.titre,
          CVE: v.cveId || 'N/A',
          Sévérité: v.severite,
          ScoreCVSS: v.scoreCVSS || '-',
          Statut: v.statut,
          'Statut Plan': plan?.statut || 'Aucun',
          Priorité: plan?.priorite || '-',
          'Date Échéance': plan?.dateEcheance 
            ? new Date(plan.dateEcheance).toLocaleDateString('fr-FR') 
            : '-',
          'Date Découverte': new Date(v.createdAt).toLocaleDateString('fr-FR'),
          'Date Correction': v.dateCorrection ? new Date(v.dateCorrection).toLocaleDateString('fr-FR') : 'Non corrigée',
        };
      });

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Rapport");

      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="Rapport_Complet_${periode}_${new Date().toISOString().slice(0,10)}.xlsx"`,
        },
      });
    }

    // ==================== PDF ====================
    if (format === 'pdf') {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([842, 595]);
      const { height } = page.getSize();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      let y = height - 50;

      page.drawText("RAPPORT COMPLET DE SÉCURITÉ", {
        x: 50, y, size: 24, font: boldFont, color: rgb(0.1, 0.1, 0.6)
      });
      y -= 30;
      page.drawText(`Période : ${periode.toUpperCase()} | ${new Date().toLocaleDateString('fr-FR')}`, {
        x: 50, y, size: 12, font
      });
      y -= 45;

      const total = vulnerabilites.length;
      const corrigees = vulnerabilites.filter(v => ['CORRIGEE', 'VERIFIE'].includes(v.statut)).length;
      const enRetard = vulnerabilites.filter(v => {
        const plan = v.plan?.[0];
        if (!plan?.dateEcheance) return false;
        return !['CORRIGEE', 'VERIFIE', 'ANNULE'].includes(v.statut) &&
               new Date(plan.dateEcheance) < now;
      }).length;

      page.drawText("STATISTIQUES", { x: 50, y, size: 16, font: boldFont });
      y -= 25;
      page.drawText(`Total Vulnérabilités : ${total}`, { x: 70, y, size: 12, font });
      y -= 18;
      page.drawText(`Corrigées : ${corrigees}`, { x: 70, y, size: 12, font });
      y -= 18;
      page.drawText(`En Retard : ${enRetard}`, { x: 70, y, size: 12, font, color: rgb(0.8, 0, 0) });
      y -= 40;

      page.drawText("VULNÉRABILITÉS", { x: 50, y, size: 16, font: boldFont });
      y -= 30;

      vulnerabilites.slice(0, 10).forEach((v: any) => {
        if (y < 120) return;
        const plan = v.plan?.[0];

        page.drawText(`• ${v.titre.substring(0, 90)}`, { x: 50, y, size: 11, font: boldFont });
        y -= 18;
        page.drawText(`  Statut: ${v.statut} | Sévérité: ${v.severite}`, { x: 55, y, size: 10, font });
        y -= 16;
        if (plan) {
          page.drawText(`  Plan: ${plan.statut} | Priorité: ${plan.priorite} | Échéance: ${new Date(plan.dateEcheance).toLocaleDateString('fr-FR')}`, 
            { x: 55, y, size: 10, font });
        }
        y -= 24;
      });

      const pdfBytes = await pdfDoc.save();
      const pdfBuffer = Buffer.from(pdfBytes);

      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="Rapport_Complet_${periode}_${new Date().toISOString().slice(0,10)}.pdf"`,
        },
      });
    }

    return NextResponse.json({ error: "Format non supporté" }, { status: 400 });

  } catch (error: any) {
    console.error('Erreur export:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}