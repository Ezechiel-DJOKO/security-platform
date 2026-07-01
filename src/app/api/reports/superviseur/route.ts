// src/app/api/reports/superviseur/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

async function collectSuperviseurData(dateDebut: Date, dateFin: Date) {
  const maintenant = new Date();

  const data = await Promise.all([
    // 0: Vulnérabilités
    prisma.vulnerabilite.findMany({
      where: {
        deletedAt: null,
        dateDecouverte: { gte: dateDebut, lte: dateFin },
      },
      include: {
        actif: true,
        assigne: true,
        plan: true,
      },
      orderBy: [{ severite: 'desc' }, { dateDecouverte: 'desc' }],
    }),

    // 1: Plans de correction
    prisma.planCorrection.findMany({
      where: { 
        createdAt: { gte: dateDebut, lte: dateFin } 
      },
      include: {
        vulnerabilite: true,
        assigne: true,
      },
      orderBy: { dateEcheance: 'asc' },
    }),

    // 2: Performance des techniciens
    prisma.utilisateur.findMany({
      where: { role: 'TECHNICIEN', actif: true, deletedAt: null },
      include: {
        plansAssignes: {
          where: { createdAt: { gte: dateDebut, lte: dateFin } },
          include: { vulnerabilite: true },
        },
      },
    }),
  ]);

  const vulnerabilites = data[0];
  const plans = data[1];
  const techniciens = data[2];

  // Calculs superviseur
  const vulnsCritiques = vulnerabilites.filter(v => v.severite === 'CRITICAL');
  
  const plansEnRetard = plans.filter(p => 
    !['TERMINE', 'VERIFIE', 'ANNULE'].includes(p.statut) && 
    new Date(p.dateEcheance) < maintenant
  );

  const performance = techniciens.map(t => ({
    nom: `${t.prenom} ${t.nom}`,
    plansAssignes: t.plansAssignes.length,
    plansTermines: t.plansAssignes.filter(p => ['TERMINE', 'VERIFIE'].includes(p.statut)).length,
    vulnsValidees: t.plansAssignes.filter(p => p.statut === 'VERIFIE').length,
  }));

  return {
    meta: { 
      genereLe: maintenant, 
      dateDebut, 
      dateFin 
    },
    stats: {
      totalVulns: vulnerabilites.length,
      vulnsCritiques: vulnsCritiques.length,
      plansTotal: plans.length,
      plansEnRetard: plansEnRetard.length,
      plansTermines: plans.filter(p => ['TERMINE', 'VERIFIE'].includes(p.statut)).length,
    },
    vulnerabilitesCritiques: vulnsCritiques,
    tousPlans: plans,
    performanceTechniciens: performance,
    toutesVulnerabilites: vulnerabilites, // utile pour rapport détaillé
  };
}

// ====================== PDF SUPERVISEUR ======================
async function buildPDFSuperviseur(data: any): Promise<NextResponse> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const page = pdfDoc.addPage([595, 842]);
  let y = 750;

  // Titre
  page.drawText("RAPPORT DE SUPERVISION", { x: 50, y, size: 26, font: bold, color: rgb(0.1, 0.3, 0.8) });
  y -= 40;

  // Stats globales
  page.drawText(`Généré le : ${new Date().toLocaleDateString('fr-FR')}`, { x: 50, y, size: 12, font });
  y -= 60;

  // KPI
  const stats = data.stats;
  page.drawText(`Vulnérabilités Critiques : ${stats.vulnsCritiques}`, { x: 50, y, size: 16, font: bold });
  y -= 30;
  page.drawText(`Plans en retard : ${stats.plansEnRetard}`, { x: 50, y, size: 16, font: bold });
  y -= 30;
  page.drawText(`Taux de plans terminés : ${stats.plansTotal > 0 ? Math.round((stats.plansTermines / stats.plansTotal) * 100) : 0}%`, { x: 50, y, size: 16, font: bold });

  y -= 50;

  // Liste des vulnérabilités critiques
  page.drawText("VULNÉRABILITÉS CRITIQUES À SUIVRE", { x: 50, y, size: 14, font: bold });
  y -= 25;

  data.vulnerabilitesCritiques.slice(0, 12).forEach((v: any) => {
    if (y < 80) return;
    page.drawText(`• ${v.titre.substring(0, 60)}`, { x: 50, y, size: 11, font });
    page.drawText(`  ${v.actif?.nom || ''} | ${v.severite}`, { x: 55, y: y - 15, size: 9, font });
    y -= 35;
  });

  const pdfBytes = await pdfDoc.save();

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="rapport-supervision-${new Date().toISOString().slice(0,10)}.pdf"`,
    },
  });
}

// ====================== HANDLER ======================
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !['SUPERVISEUR', 'ADMIN'].includes(session.user.role as string)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') ?? 'pdf';
    const type = searchParams.get('type') ?? 'global'; // global | vulnerabilite
    const vulnId = searchParams.get('vulnId');

    const dateFin = new Date();
    const dateDebut = new Date();
    dateDebut.setMonth(dateFin.getMonth() - 1);

    const data = await collectSuperviseurData(dateDebut, dateFin);

    if (format === 'pdf') {
      return buildPDFSuperviseur(data);
    }

    // Autres formats (JSON, XLSX) à implémenter si besoin
    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error('[Reports Superviseur]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}