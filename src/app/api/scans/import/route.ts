import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { scanner, target, data } = body;

    if (!scanner || !target) {
      return NextResponse.json({ status: 'error', message: 'Paramètres manquants' }, { status: 400 });
    }

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
      try {
        await prisma.actif.update({
          where: { id: actif.id },
          data: { updatedAt: new Date() }
        });
      } catch {  // ✅ CORRIGÉ : e → _e (warning ESLint variable inutilisée)
        // Silencieux
      }
    }

    const defaultUser = await prisma.utilisateur.findFirst();
    if (!defaultUser) {
      return NextResponse.json({ status: 'error', message: 'Aucun utilisateur trouvé en base pour assigner le scan' }, { status: 400 });
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

    return NextResponse.json({ 
      status: 'success', 
      message: 'Données synchronisées en base', 
      inserted_vulnerabilities: totalInserts 
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue lors de l\'import';
    console.error("❌ ERREUR API IMPORT :", message);
    return NextResponse.json({ status: 'error', message: message }, { status: 500 });
  }
}