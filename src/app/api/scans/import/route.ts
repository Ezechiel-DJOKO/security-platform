// src/app/api/scans/import/route.ts
import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { processScanResults } from '@/lib/scanner/postScanProcessor';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { scanner, target, data } = body;

    if (!scanner || !target) {
      return NextResponse.json({ status: 'error', message: 'Paramètres manquants' }, { status: 400 });
    }

    // ==================== CRÉATION / MISE À JOUR DE L'ACTIF ====================
    let actif = await prisma.actif.findFirst({
      where: {
        OR: [
          { hostname: target },
          { adresseIP: target }
        ]
      }
    });

    if (!actif) {
      actif = await prisma.actif.create({
        data: {
          nom: `Équipement ${target}`,
          adresseIP: target.includes('http') ? '127.0.0.1' : target,
          hostname: target,
          type: target.includes('http') ? 'APPLICATION' : 'SERVEUR',
          criticite: 'ELEVE',
        },
      });
    } else {
      await prisma.actif.update({
        where: { id: actif.id },
        data: { updatedAt: new Date() }
      });
    }

    // ==================== CRÉATION DU SCAN ====================
    const defaultUser = await prisma.utilisateur.findFirst();
    if (!defaultUser) {
      return NextResponse.json({ status: 'error', message: 'Aucun utilisateur trouvé' }, { status: 400 });
    }

    const scanRecord = await prisma.scan.create({
      data: {
        idActif: actif.id,
        lancerPar: defaultUser.id,
        type: 'VULNERABILITE',
        outil: scanner.toUpperCase(),
        statut: 'TERMINE',
        createdAt: new Date(),
        updatedAt: new Date()
      },
    });

    // ==================== INSERTION DES VULNÉRABILITÉS ====================
    let totalInserts = 0;

    if (scanner === 'grype' && data?.matches) {
      for (const match of data.matches) {
        if (!match.vulnerability?.id) continue;
        await prisma.vulnerabilite.create({
          data: {
            idScan: scanRecord.id,
            cveId: match.vulnerability.id,
            titre: match.artifact?.name || 'Package inconnu',
            severite: match.vulnerability.severity?.toUpperCase() || 'INFO',
            statut: 'OUVERTE',
          },
        });
        totalInserts++;
      }
    }
    else if (scanner === 'nuclei' && Array.isArray(data)) {
      for (const finding of data) {
        if (!finding) continue;
        const cveList = finding.info?.classification?.['cve-id'];
        await prisma.vulnerabilite.create({
          data: {
            idScan: scanRecord.id,
            cveId: Array.isArray(cveList) ? cveList[0] : finding['template-id'] || 'N/A',
            titre: finding.info?.name || 'Faille Nuclei',
            severite: finding.info?.severity?.toUpperCase() || 'INFO',
            statut: 'OUVERTE',
          },
        });
        totalInserts++;
      }
    }
    else if (scanner === 'openvas' && data?.results) {
      for (const res of data.results) {
        const score = parseFloat(res.severity || '0');
        const sev = score >= 9.0 ? 'CRITICAL' : score >= 7.0 ? 'HIGH' : score >= 4.0 ? 'MEDIUM' : 'LOW';
        await prisma.vulnerabilite.create({
          data: {
            idScan: scanRecord.id,
            cveId: res.cve || 'N/A',
            titre: res.nvt_name || 'Alerte OpenVAS',
            severite: sev,
            statut: 'OUVERTE',
          },
        });
        totalInserts++;
      }
    }

    // ==================== MAPPING AUTOMATIQUE ISO 27001 ====================
    console.log(`🔄 Lancement du mapping automatique pour ${totalInserts} vulnérabilités...`);
    const mappingResult = await processScanResults(scanRecord.id);

    // ==================== RÉPONSE FINALE ====================
    return NextResponse.json({
      status: 'success',
      message: 'Données synchronisées avec succès',
      inserted_vulnerabilities: totalInserts,
      iso27001_mappings: mappingResult?.mappingsCreated || 0,
      scanId: scanRecord.id
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    console.error("❌ ERREUR API IMPORT :", message);
    return NextResponse.json({ status: 'error', message }, { status: 500 });
  }
}