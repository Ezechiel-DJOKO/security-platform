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

    // 1. Recherche ou création de l'actif avec une gestion d'erreur block par block
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
      // Mettre à jour la date du dernier scan si le champ existe
      try {
        await prisma.actif.update({
          where: { id: actif.id },
          data: { updatedAt: new Date() }
        });
      } catch (e) {}
    }

    // 2. Insertion du Scan global (liaison obligatoire avec l'utilisateur admin système)
    // On récupère le premier utilisateur disponible pour éviter les conflits de clé étrangère
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

    // 3. Extraction et insertion sécurisée des vulnérabilités
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

  } catch (error: any) {
    console.error("❌ ERREUR API IMPORT :", error);
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}
