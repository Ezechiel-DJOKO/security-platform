// src/app/api/reports/export/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';
import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib';

// ============================================================
// COLLECTE DES DONNÉES COMPLÈTES
// ============================================================

async function collectData(dateDebut: Date, dateFin: Date) {
  const maintenant = new Date();

  const [
    vulnerabilites,
    scans,
    actifs,
    plans,
    utilisateurs,
  ] = await Promise.all([

    // Vulnérabilités avec relations complètes
    prisma.vulnerabilite.findMany({
      where: {
        deletedAt    : null,
        dateDecouverte: { gte: dateDebut, lte: dateFin },
      },
      include: {
        actif  : { select: { nom: true, adresseIP: true, type: true, criticite: true } },
        scan   : { select: { outil: true, cible: true, createdAt: true } },
        assigne: { select: { nom: true, prenom: true } },
        plan   : {
          select: {
            statut      : true,
            priorite    : true,
            dateEcheance: true,
            dateResolution: true,
            assigne     : { select: { nom: true, prenom: true } },
          }
        },
      },
      orderBy: [{ severite: 'desc' }, { dateDecouverte: 'desc' }],
    }),

    // Scans
    prisma.scan.findMany({
      where  : { createdAt: { gte: dateDebut, lte: dateFin } },
      include: {
        actif      : { select: { nom: true, adresseIP: true, type: true } },
        utilisateur: { select: { nom: true, prenom: true } },
        _count     : { select: { vulnerabilites: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),

    // Actifs
    prisma.actif.findMany({
      where  : { deletedAt: null },
      include: {
        _count: { select: { vulnerabilites: true, scans: true } }
      },
      orderBy: { criticite: 'desc' },
    }),

    // Plans de correction
    prisma.planCorrection.findMany({
      include: {
        vulnerabilite: {
          select: { titre: true, severite: true, statut: true }
        },
        assigne : { select: { nom: true, prenom: true } },
        createur: { select: { nom: true, prenom: true } },
      },
      orderBy: { dateEcheance: 'asc' },
    }),

    // Techniciens pour la performance
    prisma.utilisateur.findMany({
      where  : { role: 'TECHNICIEN', actif: true, deletedAt: null },
      include: {
        plansAssignes: {
          select: {
            statut        : true,
            createdAt     : true,
            dateResolution: true,
            priorite      : true,
          }
        }
      }
    }),
  ]);

  // ─── Stats calculées ──────────────────────────────────────
  const totalVulns      = vulnerabilites.length;
  const critiques       = vulnerabilites.filter(v => v.severite === 'CRITICAL').length;
  const hautes          = vulnerabilites.filter(v => v.severite === 'HIGH').length;
  const moyennes        = vulnerabilites.filter(v => v.severite === 'MEDIUM').length;
  const faibles         = vulnerabilites.filter(v => v.severite === 'LOW').length;
  const corrigees       = vulnerabilites.filter(v => ['CORRIGEE','VERIFIEE'].includes(v.statut)).length;
  const ouvertes        = vulnerabilites.filter(v => v.statut === 'OUVERTE').length;
  const enCours         = vulnerabilites.filter(v => v.statut === 'EN_COURS').length;
  const tauxCorrection  = totalVulns > 0 ? ((corrigees / totalVulns) * 100).toFixed(1) : '0';

  const plansEnRetard   = plans.filter(p =>
    !['TERMINE','VERIFIE','ANNULE'].includes(p.statut) &&
    new Date(p.dateEcheance) < maintenant
  ).length;

  const plansTermines   = plans.filter(p =>
    ['TERMINE','VERIFIE'].includes(p.statut)
  ).length;

  // Délai moyen de correction
  const plansAvecDelai  = plans.filter(p => p.dateResolution != null);
  const delaiMoyen      = plansAvecDelai.length > 0
    ? Math.round(
        plansAvecDelai.reduce((acc, p) => {
          const diff = p.dateResolution!.getTime() - p.createdAt.getTime();
          return acc + diff / (1000 * 60 * 60 * 24);
        }, 0) / plansAvecDelai.length
      )
    : 0;

  // Performance techniciens
  const perfTechniciens = utilisateurs.map(u => ({
    nom          : `${u.prenom} ${u.nom}`,
    plansTotal   : u.plansAssignes.length,
    plansTermines: u.plansAssignes.filter(p => ['TERMINE','VERIFIE'].includes(p.statut)).length,
    enRetard     : u.plansAssignes.filter(p =>
      !['TERMINE','VERIFIE','ANNULE'].includes(p.statut) &&
      new Date((p as any).dateEcheance ?? 0) < maintenant
    ).length,
  }));

  return {
    meta: {
      genereLe    : maintenant,
      dateDebut,
      dateFin,
    },
    stats: {
      totalVulns, critiques, hautes, moyennes, faibles,
      corrigees, ouvertes, enCours, tauxCorrection,
      totalScans  : scans.length,
      totalActifs : actifs.length,
      plansTotal  : plans.length,
      plansEnRetard,
      plansTermines,
      delaiMoyen,
    },
    vulnerabilites,
    scans,
    actifs,
    plans,
    perfTechniciens,
    maintenant,
  };
}

// ============================================================
// EXPORT JSON
// ============================================================

function buildJSON(data: Awaited<ReturnType<typeof collectData>>): Response {
  const payload = {
    meta              : data.meta,
    statistiques      : data.stats,
    vulnerabilites    : data.vulnerabilites.map(v => ({
      id             : v.id,
      titre          : v.titre,
      severite       : v.severite,
      statut         : v.statut,
      cveId          : v.cveId,
      scoreCVSS      : v.scoreCVSS,
      vecteurCVSS    : v.vecteurCVSS,
      description    : v.description,
      impact         : v.impact,
      recommandation : v.recommandation,
      preuve         : v.preuve,
      actif          : v.actif,
      outil          : v.scan?.outil,
      assigneA       : v.assigne ? `${v.assigne.prenom} ${v.assigne.nom}` : null,
      dateDecouverte : v.dateDecouverte,
      dateCorrection : v.dateCorrection,
      plan           : v.plan?.[0] ?? null,
    })),
    plans             : data.plans.map(p => ({
      idVulnerabilite : p.idVulnerabilite,
      titre           : p.vulnerabilite?.titre,
      severite        : p.vulnerabilite?.severite,
      priorite        : p.priorite,
      statut          : p.statut,
      dateEcheance    : p.dateEcheance,
      dateResolution  : p.dateResolution,
      assigne         : p.assigne ? `${p.assigne.prenom} ${p.assigne.nom}` : null,
      commentaire     : p.commentaire,
      enRetard        : !['TERMINE','VERIFIE','ANNULE'].includes(p.statut) &&
                        new Date(p.dateEcheance) < data.maintenant,
    })),
    actifs            : data.actifs.map(a => ({
      nom              : a.nom,
      type             : a.type,
      adresseIP        : a.adresseIP,
      hostname         : a.hostname,
      criticite        : a.criticite,
      localisation     : a.localisation,
      nbVulnerabilites : a._count.vulnerabilites,
      nbScans          : a._count.scans,
      dernierScan      : a.dernierScan,
    })),
    scans             : data.scans.map(s => ({
      outil     : s.outil,
      statut    : s.statut,
      cible     : s.cible,
      actif     : s.actif?.nom,
      lancePar  : s.utilisateur ? `${s.utilisateur.prenom} ${s.utilisateur.nom}` : null,
      date      : s.createdAt,
      duree     : s.duree,
      nbVulns   : s._count.vulnerabilites,
    })),
    performanceTechniciens: data.perfTechniciens,
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type'       : 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="rapport-securite-${
        new Date().toISOString().slice(0, 10)
      }.json"`,
    }
  });
}

// ============================================================
// EXPORT XLSX
// ============================================================

function buildXLSX(data: Awaited<ReturnType<typeof collectData>>): NextResponse {
  const wb = XLSX.utils.book_new();

  // ── Feuille 1 : Résumé ──────────────────────────────────────
  const resumeData = [
    ['RAPPORT DE SÉCURITÉ', ''],
    ['Généré le', new Date().toLocaleDateString('fr-FR')],
    ['Période début', data.meta.dateDebut.toLocaleDateString('fr-FR')],
    ['Période fin',   data.meta.dateFin.toLocaleDateString('fr-FR')],
    ['', ''],
    ['=== VULNÉRABILITÉS ===', ''],
    ['Total',           data.stats.totalVulns],
    ['Critiques',       data.stats.critiques],
    ['Hautes',          data.stats.hautes],
    ['Moyennes',        data.stats.moyennes],
    ['Faibles',         data.stats.faibles],
    ['Corrigées',       data.stats.corrigees],
    ['Ouvertes',        data.stats.ouvertes],
    ['En cours',        data.stats.enCours],
    ['Taux correction', `${data.stats.tauxCorrection}%`],
    ['', ''],
    ['=== PLANS ===', ''],
    ['Total plans',     data.stats.plansTotal],
    ['Plans en retard', data.stats.plansEnRetard],
    ['Plans terminés',  data.stats.plansTermines],
    ['Délai moyen (j)', data.stats.delaiMoyen],
    ['', ''],
    ['=== INFRASTRUCTURE ===', ''],
    ['Total actifs',    data.stats.totalActifs],
    ['Total scans',     data.stats.totalScans],
  ];
  const wsResume = XLSX.utils.aoa_to_sheet(resumeData);
  wsResume['!cols'] = [{ wch: 25 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsResume, '📊 Résumé');

  // ── Feuille 2 : Vulnérabilités ─────────────────────────────
  const vulnsRows = data.vulnerabilites.map(v => ({
    'Titre'             : v.titre,
    'Sévérité'          : v.severite,
    'Statut'            : v.statut,
    'CVE'               : v.cveId ?? '',
    'Score CVSS'        : v.scoreCVSS ?? '',
    'Vecteur CVSS'      : v.vecteurCVSS ?? '',
    'Actif'             : v.actif?.nom ?? '',
    'IP'                : v.actif?.adresseIP ?? '',
    'Type actif'        : v.actif?.type ?? '',
    'Outil scan'        : v.scan?.outil ?? '',
    'Assigné à'         : v.assigne ? `${v.assigne.prenom} ${v.assigne.nom}` : '',
    'Date découverte'   : v.dateDecouverte
                          ? new Date(v.dateDecouverte).toLocaleDateString('fr-FR')
                          : '',
    'Date correction'   : v.dateCorrection
                          ? new Date(v.dateCorrection).toLocaleDateString('fr-FR')
                          : 'Non corrigée',
    'Recommandation'    : (v.recommandation ?? '').replace(/\n/g, ' '),
    'Impact'            : (v.impact ?? '').replace(/\n/g, ' '),
    'Plan statut'       : v.plan?.[0]?.statut ?? 'Aucun plan',
    'Plan priorité'     : v.plan?.[0]?.priorite ?? '',
    'Plan échéance'     : v.plan?.[0]?.dateEcheance
                          ? new Date(v.plan[0].dateEcheance).toLocaleDateString('fr-FR')
                          : '',
  }));
  const wsVulns = XLSX.utils.json_to_sheet(vulnsRows);
  wsVulns['!cols'] = [
    { wch: 45 }, { wch: 12 }, { wch: 15 }, { wch: 16 }, { wch: 12 },
    { wch: 40 }, { wch: 20 }, { wch: 16 }, { wch: 14 }, { wch: 14 },
    { wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 40 }, { wch: 30 },
    { wch: 14 }, { wch: 12 }, { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, wsVulns, '🔴 Vulnérabilités');

  // ── Feuille 3 : Plans ──────────────────────────────────────
  const maintenant = data.maintenant;
  const plansRows = data.plans.map(p => {
    const enRetard =
      !['TERMINE','VERIFIE','ANNULE'].includes(p.statut) &&
      new Date(p.dateEcheance) < maintenant;

    const joursRestants = Math.ceil(
      (new Date(p.dateEcheance).getTime() - maintenant.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      'Vulnérabilité'   : p.vulnerabilite?.titre ?? '',
      'Sévérité'        : p.vulnerabilite?.severite ?? '',
      'Statut vuln'     : p.vulnerabilite?.statut ?? '',
      'Priorité plan'   : p.priorite,
      'Statut plan'     : p.statut,
      'Assigné à'       : p.assigne ? `${p.assigne.prenom} ${p.assigne.nom}` : 'Non assigné',
      'Créé par'        : p.createur ? `${p.createur.prenom} ${p.createur.nom}` : '',
      'Date échéance'   : new Date(p.dateEcheance).toLocaleDateString('fr-FR'),
      'Jours restants'  : joursRestants,
      'En retard'       : enRetard ? 'OUI' : 'NON',
      'Date résolution' : p.dateResolution
                          ? new Date(p.dateResolution).toLocaleDateString('fr-FR')
                          : '',
      'Commentaire'     : p.commentaire ?? '',
    };
  });
  const wsPlans = XLSX.utils.json_to_sheet(plansRows);
  wsPlans['!cols'] = [
    { wch: 45 }, { wch: 12 }, { wch: 16 }, { wch: 12 }, { wch: 14 },
    { wch: 20 }, { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 10 },
    { wch: 16 }, { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, wsPlans, '📋 Plans Correction');

  // ── Feuille 4 : Actifs ─────────────────────────────────────
  const actifsRows = data.actifs.map(a => ({
    'Nom'              : a.nom,
    'Type'             : a.type,
    'Adresse IP'       : a.adresseIP ?? '',
    'Hostname'         : a.hostname ?? '',
    'Criticité'        : a.criticite,
    'Localisation'     : a.localisation ?? '',
    'Nb vulnérabilités': a._count.vulnerabilites,
    'Nb scans'         : a._count.scans,
    'Dernier scan'     : a.dernierScan
                         ? new Date(a.dernierScan).toLocaleDateString('fr-FR')
                         : 'Jamais',
  }));
  const wsActifs = XLSX.utils.json_to_sheet(actifsRows);
  wsActifs['!cols'] = [
    { wch: 25 }, { wch: 14 }, { wch: 16 }, { wch: 20 },
    { wch: 12 }, { wch: 20 }, { wch: 18 }, { wch: 10 }, { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, wsActifs, '🖥️ Actifs');

  // ── Feuille 5 : Scans ──────────────────────────────────────
  const scansRows = data.scans.map(s => ({
    'Actif'            : s.actif?.nom ?? '',
    'IP'               : s.actif?.adresseIP ?? '',
    'Outil'            : s.outil,
    'Statut'           : s.statut,
    'Cible'            : s.cible ?? '',
    'Lancé par'        : s.utilisateur
                         ? `${s.utilisateur.prenom} ${s.utilisateur.nom}`
                         : '',
    'Date'             : new Date(s.createdAt).toLocaleDateString('fr-FR'),
    'Durée (s)'        : s.duree ?? '',
    'Nb vulnérabilités': s._count.vulnerabilites,
  }));
  const wsScans = XLSX.utils.json_to_sheet(scansRows);
  wsScans['!cols'] = [
    { wch: 22 }, { wch: 16 }, { wch: 14 }, { wch: 12 },
    { wch: 18 }, { wch: 20 }, { wch: 14 }, { wch: 10 }, { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, wsScans, '🔍 Scans');

  // ── Feuille 6 : Performance techniciens ───────────────────
  const perfRows = data.perfTechniciens.map(t => ({
    'Technicien'    : t.nom,
    'Plans total'   : t.plansTotal,
    'Plans terminés': t.plansTermines,
    'En retard'     : t.enRetard,
    'Taux réussite' : t.plansTotal > 0
                      ? `${((t.plansTermines / t.plansTotal) * 100).toFixed(1)}%`
                      : '0%',
  }));
  const wsPerf = XLSX.utils.json_to_sheet(
    perfRows.length > 0 ? perfRows : [{ Info: 'Aucune donnée disponible' }]
  );
  wsPerf['!cols'] = [{ wch: 25 }, { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsPerf, '👥 Techniciens');

  // Génération du buffer
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

  return new NextResponse(buffer, {
    headers: {
      'Content-Type'       : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="rapport-securite-${
        new Date().toISOString().slice(0, 10)
      }.xlsx"`,
    }
  });
}

// ============================================================
// EXPORT PDF
// ============================================================

// Helpers PDF
function drawSectionTitle(
  page: PDFPage,
  text: string,
  y: number,
  font: PDFFont,
  size = 14
): number {
  page.drawRectangle({
    x: 40, y: y - 4,
    width: 515, height: size + 10,
    color: rgb(0.07, 0.1, 0.25),
  });
  page.drawText(text, {
    x: 50, y, size, font,
    color: rgb(1, 1, 1),
  });
  return y - (size + 20);
}

function drawKpiBox(
  page: PDFPage,
  x: number, y: number,
  label: string, value: string,
  font: PDFFont, boldFont: PDFFont,
  bgColor: [number, number, number] = [0.95, 0.95, 0.97]
) {
  page.drawRectangle({
    x, y: y - 35, width: 118, height: 50,
    color: rgb(...bgColor),
    borderColor: rgb(0.8, 0.8, 0.85),
    borderWidth: 1,
  });
  page.drawText(value, {
    x: x + 10, y: y - 10,
    size: 18, font: boldFont,
    color: rgb(0.1, 0.1, 0.6),
  });
  page.drawText(label, {
    x: x + 10, y: y - 28,
    size: 8, font,
    color: rgb(0.4, 0.4, 0.5),
  });
}

function severiteColor(sev: string): [number, number, number] {
  switch (sev) {
    case 'CRITICAL': return [0.85, 0.1, 0.1];
    case 'HIGH'    : return [0.9, 0.4, 0.0];
    case 'MEDIUM'  : return [0.8, 0.65, 0.0];
    case 'LOW'     : return [0.1, 0.6, 0.2];
    default        : return [0.4, 0.4, 0.4];
  }
}

async function buildPDF(
  data: Awaited<ReturnType<typeof collectData>>
): Promise<NextResponse> {
  const pdfDoc  = await PDFDocument.create();
  const font     = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const W = 595.28;  // A4 width
  const H = 841.89;  // A4 height
  const marginX = 40;
  const colW    = (W - marginX * 2) / 2;

  // ─── Page 1 : Couverture ─────────────────────────────────

  const cover = pdfDoc.addPage([W, H]);

  // Fond dégradé simulé
  cover.drawRectangle({ x: 0, y: 0, width: W, height: H, color: rgb(0.05, 0.08, 0.2) });
  cover.drawRectangle({ x: 0, y: H * 0.4, width: W, height: H * 0.6, color: rgb(0.07, 0.12, 0.3) });

  // Logo/icône
cover.drawSvgPath(
  'M 0 -20 L 15 -12 L 15 5 Q 15 18 0 25 Q -15 18 -15 5 L -15 -12 Z',
  { x: W / 2, y: H * 0.75, color: rgb(0.3, 0.6, 1), borderColor: rgb(0.2, 0.4, 0.8), borderWidth: 1.5 }
);
  cover.drawText('RAPPORT DE SÉCURITÉ', {
    x: W / 2 - 130, y: H * 0.65,
    size: 26, font: boldFont,
    color: rgb(1, 1, 1),
  });
  cover.drawText('Plateforme de Gestion des Vulnérabilités', {
    x: W / 2 - 120, y: H * 0.60,
    size: 13, font,
    color: rgb(0.6, 0.7, 0.9),
  });

  // Séparateur
  cover.drawLine({
    start: { x: 80, y: H * 0.56 },
    end  : { x: W - 80, y: H * 0.56 },
    thickness: 1,
    color: rgb(0.3, 0.4, 0.6),
  });

  cover.drawText(`Généré le : ${new Date().toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric'
  })}`, {
    x: W / 2 - 80, y: H * 0.52,
    size: 11, font,
    color: rgb(0.7, 0.8, 0.9),
  });
  cover.drawText(`Période : ${data.meta.dateDebut.toLocaleDateString('fr-FR')} — ${
    data.meta.dateFin.toLocaleDateString('fr-FR')}`, {
    x: W / 2 - 80, y: H * 0.49,
    size: 11, font,
    color: rgb(0.7, 0.8, 0.9),
  });

  // Stats rapides sur la couverture
  const statsCover = [
    { label: 'Vulnérabilités', value: String(data.stats.totalVulns) },
    { label: 'Critiques',      value: String(data.stats.critiques) },
    { label: 'Corrigées',      value: `${data.stats.tauxCorrection}%` },
    { label: 'Plans actifs',   value: String(data.stats.plansTotal) },
  ];
  statsCover.forEach((s, i) => {
    const x = 60 + i * 125;
    cover.drawRectangle({
      x, y: H * 0.35, width: 110, height: 60,
      color: rgb(0.1, 0.15, 0.35),
      borderColor: rgb(0.3, 0.4, 0.7),
      borderWidth: 1,
    });
    cover.drawText(s.value, {
      x: x + 10, y: H * 0.35 + 35,
      size: 20, font: boldFont,
      color: rgb(0.4, 0.7, 1),
    });
    cover.drawText(s.label, {
      x: x + 10, y: H * 0.35 + 15,
      size: 9, font,
      color: rgb(0.6, 0.7, 0.9),
    });
  });

  // ─── Page 2 : Statistiques ───────────────────────────────

  const p2 = pdfDoc.addPage([W, H]);
  let y    = H - 50;

  y = drawSectionTitle(p2, '1. RÉSUMÉ EXÉCUTIF', y, boldFont);
  y -= 15;

  // KPI boxes ligne 1
  drawKpiBox(p2, 40,  y, 'Total vulnérabilités', String(data.stats.totalVulns),  font, boldFont, [0.95, 0.93, 0.97]);
  drawKpiBox(p2, 165, y, 'Critiques',             String(data.stats.critiques),   font, boldFont, [1, 0.93, 0.93]);
  drawKpiBox(p2, 290, y, 'Hautes',                String(data.stats.hautes),      font, boldFont, [1, 0.96, 0.90]);
  drawKpiBox(p2, 415, y, 'Taux correction',        `${data.stats.tauxCorrection}%`,font, boldFont, [0.92, 1, 0.94]);
  y -= 60;

  // KPI boxes ligne 2
  drawKpiBox(p2, 40,  y, 'Ouvertes',     String(data.stats.ouvertes),      font, boldFont, [1, 0.94, 0.94]);
  drawKpiBox(p2, 165, y, 'En cours',     String(data.stats.enCours),       font, boldFont, [0.92, 0.95, 1]);
  drawKpiBox(p2, 290, y, 'Corrigées',    String(data.stats.corrigees),     font, boldFont, [0.92, 1, 0.94]);
  drawKpiBox(p2, 415, y, 'Délai moyen',  `${data.stats.delaiMoyen}j`,      font, boldFont, [1, 0.98, 0.90]);
  y -= 70;

  // KPI boxes ligne 3
  drawKpiBox(p2, 40,  y, 'Total actifs',     String(data.stats.totalActifs),    font, boldFont);
  drawKpiBox(p2, 165, y, 'Total scans',      String(data.stats.totalScans),     font, boldFont);
  drawKpiBox(p2, 290, y, 'Plans correction', String(data.stats.plansTotal),     font, boldFont);
  drawKpiBox(p2, 415, y, 'Plans en retard',  String(data.stats.plansEnRetard),  font, boldFont, [1, 0.93, 0.93]);
  y -= 70;

  // Répartition sévérité
  y = drawSectionTitle(p2, '2. RÉPARTITION PAR SÉVÉRITÉ', y, boldFont);
  y -= 10;

  const sevStats = [
    { label: 'CRITICAL', count: data.stats.critiques, pct: data.stats.totalVulns > 0 ? (data.stats.critiques / data.stats.totalVulns) : 0 },
    { label: 'HIGH',     count: data.stats.hautes,    pct: data.stats.totalVulns > 0 ? (data.stats.hautes    / data.stats.totalVulns) : 0 },
    { label: 'MEDIUM',   count: data.stats.moyennes,  pct: data.stats.totalVulns > 0 ? (data.stats.moyennes  / data.stats.totalVulns) : 0 },
    { label: 'LOW',      count: data.stats.faibles,   pct: data.stats.totalVulns > 0 ? (data.stats.faibles   / data.stats.totalVulns) : 0 },
  ];

  sevStats.forEach(s => {
    const barW = Math.max(s.pct * 350, 2);
    p2.drawText(`${s.label}`, { x: 50, y, size: 10, font: boldFont, color: rgb(...severiteColor(s.label)) });
    p2.drawRectangle({ x: 130, y: y - 2, width: barW, height: 12, color: rgb(...severiteColor(s.label)) });
    p2.drawText(`${s.count} (${(s.pct * 100).toFixed(1)}%)`, { x: 490, y, size: 10, font, color: rgb(0.3, 0.3, 0.3) });
    y -= 22;
  });
  y -= 10;

  // Top actifs vulnérables
  y = drawSectionTitle(p2, '3. TOP ACTIFS VULNÉRABLES', y, boldFont);
  y -= 10;

  const topActifs = [...data.actifs]
    .sort((a, b) => b._count.vulnerabilites - a._count.vulnerabilites)
    .slice(0, 6);

  topActifs.forEach((a, i) => {
    const pct = data.stats.totalVulns > 0 ? a._count.vulnerabilites / data.stats.totalVulns : 0;
    const barW = Math.max(pct * 300, 2);
    p2.drawText(`${i + 1}. ${a.nom.substring(0, 25)}`, { x: 50, y, size: 9, font: boldFont, color: rgb(0.1, 0.1, 0.4) });
    p2.drawRectangle({ x: 200, y: y - 2, width: barW, height: 10, color: rgb(0.2, 0.4, 0.8) });
    p2.drawText(`${a._count.vulnerabilites}`, { x: 510, y, size: 9, font, color: rgb(0.3, 0.3, 0.3) });
    y -= 20;
  });

  // ─── Page 3 : Vulnérabilités CRITICAL + HIGH ─────────────

  const p3    = pdfDoc.addPage([W, H]);
  y           = H - 50;
  y = drawSectionTitle(p3, '4. VULNÉRABILITÉS CRITIQUES ET HAUTES', y, boldFont);
  y -= 10;

  // En-tête tableau
  const colsVuln = [40, 200, 295, 360, 430, 500];
  const headers  = ['Titre', 'Sévérité', 'CVE', 'Actif', 'Statut', 'CVSS'];

  p3.drawRectangle({ x: 38, y: y - 4, width: 519, height: 16, color: rgb(0.15, 0.2, 0.4) });
  headers.forEach((h, i) => {
    p3.drawText(h, {
      x: colsVuln[i] + 2, y, size: 8,
      font: boldFont, color: rgb(1, 1, 1),
    });
  });
  y -= 20;

  const critHighVulns = data.vulnerabilites.filter(v => ['CRITICAL','HIGH'].includes(v.severite));

  critHighVulns.slice(0, 25).forEach((v, i) => {
    if (y < 60) return;

    if (i % 2 === 0) {
      p3.drawRectangle({ x: 38, y: y - 4, width: 519, height: 15, color: rgb(0.96, 0.97, 1) });
    }

    const cols = [
      (v.titre ?? '').substring(0, 22),
      v.severite ?? '',
      v.cveId ?? '—',
      (v.actif?.nom ?? '—').substring(0, 12),
      v.statut ?? '',
      v.scoreCVSS ? String(v.scoreCVSS) : '—',
    ];

    cols.forEach((val, ci) => {
      const color = ci === 1 ? severiteColor(v.severite ?? '') : [0.1, 0.1, 0.1] as [number, number, number];
      p3.drawText(val, {
        x: colsVuln[ci] + 2, y,
        size: 7.5, font: ci === 1 ? boldFont : font,
        color: rgb(...color),
      });
    });
    y -= 17;
  });

  // ─── Page 4 : Plans de correction ───────────────────────

  const p4 = pdfDoc.addPage([W, H]);
  y        = H - 50;
  y = drawSectionTitle(p4, '5. PLANS DE CORRECTION', y, boldFont);
  y -= 10;

  const colsPlan = [40, 195, 270, 335, 400, 468, 520];
  const hPlan    = ['Vulnérabilité', 'Sévérité', 'Priorité', 'Statut', 'Assigné', 'Échéance', 'Retard'];

  p4.drawRectangle({ x: 38, y: y - 4, width: 519, height: 16, color: rgb(0.15, 0.2, 0.4) });
  hPlan.forEach((h, i) => {
    p4.drawText(h, { x: colsPlan[i] + 2, y, size: 8, font: boldFont, color: rgb(1, 1, 1) });
  });
  y -= 20;

  data.plans.slice(0, 30).forEach((p, i) => {
    if (y < 60) return;

    const enRetard =
      !['TERMINE','VERIFIE','ANNULE'].includes(p.statut) &&
      new Date(p.dateEcheance) < data.maintenant;

    if (i % 2 === 0) {
      p4.drawRectangle({ x: 38, y: y - 4, width: 519, height: 15, color: rgb(0.96, 0.97, 1) });
    }

    const row = [
      (p.vulnerabilite?.titre ?? '').substring(0, 20),
      p.vulnerabilite?.severite ?? '',
      p.priorite ?? '',
      p.statut ?? '',
      p.assigne ? `${p.assigne.prenom} ${p.assigne.nom}`.substring(0, 13) : 'Non assigné',
      new Date(p.dateEcheance).toLocaleDateString('fr-FR'),
      enRetard ? 'OUI' : 'NON',
    ];

    row.forEach((val, ci) => {
      let color: [number, number, number] = [0.1, 0.1, 0.1];
      if (ci === 1) color = severiteColor(p.vulnerabilite?.severite ?? '');
      if (ci === 6) color = enRetard ? [0.8, 0.1, 0.1] : [0.1, 0.6, 0.2];

      p4.drawText(val, {
        x: colsPlan[ci] + 2, y,
        size: 7.5,
        font: (ci === 1 || ci === 6) ? boldFont : font,
        color: rgb(...color),
      });
    });
    y -= 17;
  });

  // ─── Page 5 : Actifs + Scans ────────────────────────────

  const p5 = pdfDoc.addPage([W, H]);
  y        = H - 50;
  y = drawSectionTitle(p5, '6. INVENTAIRE DES ACTIFS', y, boldFont);
  y -= 10;

  const colsActif = [40, 160, 220, 290, 355, 415, 470, 520];
  const hActif    = ['Nom', 'Type', 'IP', 'Criticité', 'Vulns', 'Scans', 'Dernier scan'];

  p5.drawRectangle({ x: 38, y: y - 4, width: 519, height: 16, color: rgb(0.15, 0.2, 0.4) });
  hActif.forEach((h, i) => {
    p5.drawText(h, { x: colsActif[i] + 2, y, size: 8, font: boldFont, color: rgb(1, 1, 1) });
  });
  y -= 20;

  data.actifs.slice(0, 20).forEach((a, i) => {
    if (y < 60) return;

    if (i % 2 === 0) {
      p5.drawRectangle({ x: 38, y: y - 4, width: 519, height: 15, color: rgb(0.96, 0.97, 1) });
    }

    [
      a.nom.substring(0, 16),
      a.type ?? '',
      a.adresseIP ?? a.hostname ?? '',
      a.criticite ?? '',
      String(a._count.vulnerabilites),
      String(a._count.scans),
      a.dernierScan ? new Date(a.dernierScan).toLocaleDateString('fr-FR') : 'Jamais',
    ].forEach((val, ci) => {
      p5.drawText(val, { x: colsActif[ci] + 2, y, size: 7.5, font, color: rgb(0.1, 0.1, 0.1) });
    });
    y -= 17;
  });

  y -= 20;
  y = drawSectionTitle(p5, '7. SCANS RÉCENTS', y, boldFont);
  y -= 10;

  const colsScan = [40, 150, 215, 275, 335, 420, 480];
  const hScan    = ['Actif', 'Outil', 'Statut', 'Cible', 'Lancé par', 'Date', 'Vulns'];

  p5.drawRectangle({ x: 38, y: y - 4, width: 519, height: 16, color: rgb(0.15, 0.2, 0.4) });
  hScan.forEach((h, i) => {
    p5.drawText(h, { x: colsScan[i] + 2, y, size: 8, font: boldFont, color: rgb(1, 1, 1) });
  });
  y -= 20;

  data.scans.slice(0, 15).forEach((s, i) => {
    if (y < 60) return;

    if (i % 2 === 0) {
      p5.drawRectangle({ x: 38, y: y - 4, width: 519, height: 15, color: rgb(0.96, 0.97, 1) });
    }

    [
      (s.actif?.nom ?? '—').substring(0, 14),
      s.outil ?? '',
      s.statut ?? '',
      (s.cible ?? '').substring(0, 14),
      s.utilisateur ? `${s.utilisateur.prenom} ${s.utilisateur.nom}`.substring(0, 16) : '—',
      new Date(s.createdAt).toLocaleDateString('fr-FR'),
      String(s._count.vulnerabilites),
    ].forEach((val, ci) => {
      p5.drawText(val, { x: colsScan[ci] + 2, y, size: 7.5, font, color: rgb(0.1, 0.1, 0.1) });
    });
    y -= 17;
  });

  // ─── Page 6 : Performance techniciens ───────────────────

  if (data.perfTechniciens.some(t => t.plansTotal > 0)) {
    const p6 = pdfDoc.addPage([W, H]);
    y        = H - 50;
    y = drawSectionTitle(p6, '8. PERFORMANCE DES TECHNICIENS', y, boldFont);
    y -= 20;

    data.perfTechniciens
      .filter(t => t.plansTotal > 0)
      .forEach(t => {
        const taux = t.plansTotal > 0
          ? ((t.plansTermines / t.plansTotal) * 100)
          : 0;
        const barW = Math.max((taux / 100) * 350, 2);

        p6.drawText(t.nom, { x: 50, y, size: 11, font: boldFont, color: rgb(0.1, 0.1, 0.4) });
        y -= 16;
        p6.drawText(`Plans: ${t.plansTotal} | Terminés: ${t.plansTermines} | En retard: ${t.enRetard}`,
          { x: 60, y, size: 9, font, color: rgb(0.3, 0.3, 0.3) });
        y -= 14;
        p6.drawRectangle({ x: 60, y: y - 2, width: 350, height: 10, color: rgb(0.88, 0.9, 0.95) });
        p6.drawRectangle({ x: 60, y: y - 2, width: barW, height: 10, color: rgb(0.2, 0.6, 0.3) });
        p6.drawText(`${taux.toFixed(1)}%`, { x: 420, y, size: 9, font: boldFont, color: rgb(0.1, 0.5, 0.2) });
        y -= 30;
      });
  }

  // ─── Numérotation des pages ──────────────────────────────
  const pages = pdfDoc.getPages();
  pages.forEach((pg, i) => {
    if (i === 0) return; // Pas de numéro sur la couverture
    pg.drawText(`Page ${i} / ${pages.length - 1}`, {
      x: W - 100, y: 20,
      size: 8, font,
      color: rgb(0.5, 0.5, 0.5),
    });
    pg.drawText('Rapport de Sécurité — Confidentiel', {
      x: 40, y: 20,
      size: 8, font,
      color: rgb(0.5, 0.5, 0.5),
    });
  });

  const pdfBytes = await pdfDoc.save();

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type'       : 'application/pdf',
      'Content-Disposition': `attachment; filename="rapport-securite-${
        new Date().toISOString().slice(0, 10)
      }.pdf"`,
    }
  });
}

// ============================================================
// HANDLER PRINCIPAL
// ============================================================

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format  = searchParams.get('format') ?? 'json';
    const periode = searchParams.get('periode') ?? 'mois';

    if (!['json', 'xlsx', 'pdf'].includes(format)) {
      return NextResponse.json(
        { error: 'Format invalide. Utilisez: json, xlsx, pdf' },
        { status: 400 }
      );
    }

    // Calcul de la période
    const dateFin   = new Date();
    const dateDebut = new Date();

    switch (periode) {
      case 'trimestre': dateDebut.setMonth(dateFin.getMonth() - 3); break;
      case 'annee'    : dateDebut.setFullYear(dateFin.getFullYear() - 1); break;
      default         : dateDebut.setMonth(dateFin.getMonth() - 1);
    }

    console.log(`[EXPORT] Format: ${format} | Période: ${periode} | User: ${session.user.email}`);

    const data = await collectData(dateDebut, dateFin);

    switch (format) {
      case 'json': return buildJSON(data);
      case 'xlsx': return buildXLSX(data);
      case 'pdf' : return buildPDF(data);
      default    : return NextResponse.json({ error: 'Format invalide' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('[EXPORT] Erreur:', error.message);
    return NextResponse.json(
      { error: 'Erreur lors de la génération du rapport', details: error.message },
      { status: 500 }
    );
  }
}