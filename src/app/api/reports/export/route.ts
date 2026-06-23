import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import * as XLSX from 'xlsx';
import puppeteer from 'puppeteer';

interface Vulnerabilite {
  id: string;
  titre: string;
  severite: string;
  scoreCVSS: number | null;
  statut: string;
  dateDecouverte: Date | null;
}

interface Controle {
  id: string;
  code: string;
  nom: string;
  statut: string;
  referentiel: string;
}

interface Recommandation {
  priorite: string;
  titre: string;
  description: string;
  action: string;
  delai: string;
}

interface ExportData {
  success: boolean;
  metadata: {
    genereLe: string;
    format: string;
    totalVulnerabilites: number;
    totalControles: number;
    typeRapport: string;
  };
  vulnerabilites: Vulnerabilite[];
  controles: Controle[];
  recommendations: Recommandation[];
  statistiques: {
    parSeverite: Record<string, number>;
    conformite: {
      tauxConformite: number;
      conforme: number;
      nonConforme: number;
      totalEvalues: number;
      totalGlobaux: number;
    };
  };
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'json';
  const mesRapports = searchParams.get('mesRapports') === 'true';

  try {
    let vulnerabilities: any[] = [];
    let controles: any[] = [];

    if (mesRapports && session.user.role === 'TECHNICIEN') {
      // ==================== VERSION TECHNICIEN ====================
      vulnerabilities = await prisma.vulnerabilite.findMany({
        where: {
          assigneA: session.user.id,
        },
        take: 50,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          titre: true,
          severite: true,
          scoreCVSS: true,
          statut: true,
          dateDecouverte: true,
        },
      });

      controles = await prisma.controlConformite.findMany({
        take: 30,
        where: { statut: { not: 'NON_EVALUE' } },
      });

    } else {
      // ==================== VERSION ADMIN / AUDITEUR / SUPERVISEUR ====================
      [vulnerabilities, controles] = await Promise.all([
        prisma.vulnerabilite.findMany({
          where: {
            plan: { statut: "VERIFIE" }
          },
          take: 100,
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            titre: true,
            severite: true,
            scoreCVSS: true,
            statut: true,
            dateDecouverte: true,
          },
        }),
        prisma.controlConformite.findMany({
          take: 100,
          select: {
            id: true,
            code: true,
            nom: true,
            statut: true,
            referentiel: true,
          },
        }),
      ]);
    }

    const recommendations = generateRecommendations(vulnerabilities, controles);

    const data: ExportData = {
      success: true,
      metadata: {
        genereLe: new Date().toISOString(),
        format,
        totalVulnerabilites: vulnerabilities.length,
        totalControles: controles.length,
        typeRapport: mesRapports
          ? "Rapport Personnel - Mes Corrections"
          : "Rapport des vulnérabilités vérifiées (Plan de Correction)",
      },
      vulnerabilites: vulnerabilities,
      controles,
      recommendations,
      statistiques: {
        parSeverite: groupBySeverity(vulnerabilities),
        conformite: calculateConformite(controles),
      },
    };

    if (format === 'xlsx') return exportExcel(data);
    if (format === 'pdf') return await exportPDF(data);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Erreur API Rapports:', error);
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return NextResponse.json({ error: 'Erreur serveur', details: message }, { status: 500 });
  }
}

// ================== FONCTIONS UTILITAIRES (inchangées) ==================
function generateRecommendations(vulnerabilities: any[], controles: any[]) {
  const recs: Recommandation[] = [];
  
  recs.push({
    priorite: "BASSE",
    titre: `Suivi des ${vulnerabilities.length} vulnérabilités`,
    description: "Vulnérabilités assignées ou vérifiées.",
    action: "Maintenir une surveillance régulière.",
    delai: "Ongoing"
  });

  const nonConformes = controles.filter(c => c.statut === 'NON_CONFORME');
  if (nonConformes.length > 0) {
    recs.push({
      priorite: "MOYENNE",
      titre: "Améliorer le taux de conformité",
      description: `${nonConformes.length} contrôles ne sont pas conformes.`,
      action: "Définir un plan de remédiation.",
      delai: "Sous 15 jours"
    });
  }
  return recs;
}

function groupBySeverity(vulns: any[]) {
  const stats: Record<string, number> = {};
  vulns.forEach(v => {
    const sev = v.severite || 'UNKNOWN';
    stats[sev] = (stats[sev] || 0) + 1;
  });
  return stats;
}

function calculateConformite(controles: any[]) {
  const controlesEvalues = controles.filter(c =>
    c.statut && !['NON_EVALUE', 'NON_EVAL'].includes(c.statut)
  );
  const total = controlesEvalues.length;
  const conforme = controlesEvalues.filter(c => c.statut === 'CONFORME').length;
  const nonConforme = total - conforme;

  return {
    tauxConformite: total ? Math.round((conforme / total) * 100) : 0,
    conforme,
    nonConforme,
    totalEvalues: total,
    totalGlobaux: controles.length
  };
}

// ================== EXPORTS ==================
function exportExcel(data: ExportData) {
  const wb = XLSX.utils.book_new();
  const vulnsData = data.vulnerabilites.map(v => ({
    ID: v.id,
    Titre: v.titre,
    Severite: v.severite,
    CVSS: v.scoreCVSS,
    Statut: v.statut,
    "Date Découverte": v.dateDecouverte ? new Date(v.dateDecouverte).toLocaleDateString('fr-FR') : '',
  }));

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(vulnsData), "Vulnérabilités Vérifiées");

  const conformiteData = data.controles.map(c => ({
    Code: c.code,
    Nom: c.nom,
    Referentiel: c.referentiel,
    Statut: c.statut,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(conformiteData), "Conformité");

  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

  return new NextResponse(buffer as any, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="rapport-verifiees-${new Date().toISOString().slice(0,10)}.xlsx"`,
    },
  });
}

async function exportPDF(data: ExportData) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    const html = generatePDFHTML(data);
    await page.setContent(html, { waitUntil: 'load' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: 40, right: 40, bottom: 40, left: 40 },
    });

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="rapport-verifiees-${new Date().toISOString().slice(0,10)}.pdf"`,
      },
    });
  } finally {
    await browser.close();
  }
}

function generatePDFHTML(data: ExportData) {
  const recsHTML = data.recommendations.map(rec => `
    <tr>
      <td style="background-color: ${rec.priorite === 'HAUTE' ? '#fee2e2' : rec.priorite === 'MOYENNE' ? '#fef3c7' : '#ecfdf5'}; font-weight: bold;">
        ${rec.priorite}
      </td>
      <td><strong>${rec.titre}</strong></td>
      <td>${rec.description}</td>
      <td>${rec.action}</td>
      <td>${rec.delai}</td>
    </tr>
  `).join('');

  const conf = data.statistiques.conformite;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Rapport des Vulnérabilités Vérifiées</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; color: #111; line-height: 1.6; }
        h1 { color: #1e40af; text-align: center; }
        h2 { color: #1e40af; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #999; padding: 10px; text-align: left; vertical-align: top; }
        th { background-color: #f1f5f9; }
      </style>
    </head>
    <body>
      <h1>Rapport des Vulnérabilités Vérifiées</h1>
      <p><strong>Généré le :</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
      
      <h2>Synthèse</h2>
      <p><strong>Total Vulnérabilités Vérifiées :</strong> ${data.metadata.totalVulnerabilites}</p>
      <p><strong>Taux de Conformité :</strong> ${conf.tauxConformite}% 
         (${conf.conforme} conformes / ${conf.totalEvalues} évalués)</p>
      <p><strong>Contrôles totaux :</strong> ${conf.totalGlobaux}</p>

      <h2>Recommandations</h2>
      <table>
        <tr><th>Priorité</th><th>Titre</th><th>Description</th><th>Action</th><th>Délai</th></tr>
        ${recsHTML}
      </table>

      <h2>Vulnérabilités Vérifiées</h2>
      <table>
        <tr><th>ID</th><th>Titre</th><th>Sévérité</th><th>Score CVSS</th><th>Date Découverte</th></tr>
        ${data.vulnerabilites.slice(0, 10).map(v => `
          <tr>
            <td>${v.id}</td>
            <td>${v.titre}</td>
            <td>${v.severite}</td>
            <td>${v.scoreCVSS || 'N/A'}</td>
            <td>${v.dateDecouverte ? new Date(v.dateDecouverte).toLocaleDateString('fr-FR') : ''}</td>
          </tr>
        `).join('')}
      </table>
    </body>
    </html>`;
}