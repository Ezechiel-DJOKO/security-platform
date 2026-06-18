import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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
    };
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'json';

  try {
    const [vulnerabilities, controles] = await Promise.all([
      prisma.vulnerabilite.findMany({
        take: 100,
        orderBy: { dateDecouverte: 'desc' },
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
        take: 50,
        select: {
          id: true,
          code: true,
          nom: true,
          statut: true,
          referentiel: true,
        },
      }),
    ]);

    const recommendations = generateRecommendations(vulnerabilities, controles);

    const data: ExportData = {
      success: true,
      metadata: {
        genereLe: new Date().toISOString(),
        format,
        totalVulnerabilites: vulnerabilities.length,
        totalControles: controles.length,
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
    console.error('Erreur API Export:', error);
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return NextResponse.json({ error: 'Erreur serveur', details: message }, { status: 500 });
  }
}

// ================== FONCTIONS UTILITAIRES ==================
function generateRecommendations(vulnerabilities: any[], controles: any[]) {
  const recs: Recommandation[] = [];

  const criticalVulns = vulnerabilities.filter(v =>
    v.severite === 'CRITICAL' || (v.scoreCVSS && v.scoreCVSS >= 9.0)
  );

  if (criticalVulns.length > 0) {
    recs.push({
      priorite: "HAUTE",
      titre: `Corriger les ${criticalVulns.length} vulnérabilités critiques`,
      description: "Ces vulnérabilités peuvent être exploitées à distance.",
      action: "Appliquer les patches immédiatement + analyse approfondie.",
      delai: "Sous 48 heures"
    });
  }

  const nonConformes = controles.filter(c => c.statut === 'NON_CONFORME');
  if (nonConformes.length > 0) {
    recs.push({
      priorite: "MOYENNE",
      titre: "Améliorer le taux de conformité",
      description: `${nonConformes.length} contrôles ne sont pas conformes.`,
      action: "Définir un plan de remédiation ISO 27001.",
      delai: "Sous 15 jours"
    });
  }

  recs.push({
    priorite: "BASSE",
    titre: "Mettre en place une revue mensuelle",
    description: "Automatiser les scans et générer des rapports périodiques.",
    action: "Planifier un scan complet tous les 15 jours.",
    delai: "Ongoing"
  });

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
  const total = controles.length;
  const conforme = controles.filter(c => c.statut === 'CONFORME').length;
  return {
    tauxConformite: total ? Math.round((conforme / total) * 100) : 0,
    conforme,
    nonConforme: total - conforme,
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

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(vulnsData), "Vulnérabilités");

  const conformiteData = data.controles.map(c => ({
    Code: c.code,
    Nom: c.nom,
    Referentiel: c.referentiel,
    Statut: c.statut,
  }));

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(conformiteData), "Conformité");

  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

  return new NextResponse(buffer as any, {  // Correction ici
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="rapport-securite-${new Date().toISOString().slice(0,10)}.xlsx"`,
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

    return new NextResponse(pdfBuffer as any, {  // Correction ici
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="rapport-securite-${new Date().toISOString().slice(0,10)}.pdf"`,
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

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Rapport de Sécurité</title>
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
      <h1>Rapport de Sécurité</h1>
      <p><strong>Généré le :</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
      <h2>Synthèse</h2>
      <p><strong>Total Vulnérabilités :</strong> ${data.metadata.totalVulnerabilites}</p>
      <p><strong>Taux de Conformité :</strong> ${data.statistiques.conformite.tauxConformite}%</p>
      
      <h2>Recommandations Prioritaires</h2>
      <table>
        <tr><th>Priorité</th><th>Titre</th><th>Description</th><th>Action</th><th>Délai</th></tr>
        ${recsHTML}
      </table>

      <h2>Vulnérabilités Récentes</h2>
      <table>
        <tr><th>ID</th><th>Titre</th><th>Sévérité</th><th>Score CVSS</th><th>Statut</th></tr>
        ${data.vulnerabilites.slice(0, 10).map(v => `
          <tr>
            <td>${v.id}</td>
            <td>${v.titre}</td>
            <td>${v.severite}</td>
            <td>${v.scoreCVSS || 'N/A'}</td>
            <td>${v.statut}</td>
          </tr>
        `).join('')}
      </table>
    </body>
    </html>`;
}