// src/features/vulnerabilites/repository.ts
import { prisma } from '@/lib/prisma';
import { StatutVulnerabilite, Priorite } from '@prisma/client';

export const vulnerabiliteRepository = {

  async createMany(vulnerabilites: any[]) {
    return prisma.vulnerabilite.createMany({
      data: vulnerabilites,
      skipDuplicates: true,
    });
  },

  async updateStatut(
    idVuln: string,
    nouveauStatut: StatutVulnerabilite,
    userId: string,
    commentaire?: string
  ) {
    const vulnExistante = await prisma.vulnerabilite.findUnique({
      where: { id: idVuln }
    });

    if (!vulnExistante) throw new Error('Vulnérabilité non trouvée');

    const updated = await prisma.vulnerabilite.update({
      where: { id: idVuln },
      data: {
        statut: nouveauStatut,
        dateCorrection: nouveauStatut === 'CORRIGEE' ? new Date() : null,
      }
    });

    // Enregistrement dans l'historique
    await prisma.historiqueVulnerabilite.create({
      data: {
        idVulnerabilite: idVuln,
        ancienStatut: vulnExistante.statut,
        nouveauStatut,
        commentaire,
        modifiePar: userId,
      }
    });

    return updated;
  },

  async assigner(idVuln: string, userId: string, priorite: Priorite = 'MOYENNE') {
    const vuln = await prisma.vulnerabilite.findUnique({ where: { id: idVuln } });
    if (!vuln) throw new Error('Vulnérabilité non trouvée');

    const plan = await prisma.planCorrection.upsert({
      where: { idVulnerabilite: idVuln },
      update: { 
        assigneA: userId, 
        priorite,
        dateEcheance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      },
      create: {
        idVulnerabilite: idVuln,
        assigneA: userId,
        priorite,
        dateEcheance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }
    });

    const vulnerabilite = await this.updateStatut(idVuln, 'EN_COURS', userId);

    return { vulnerabilite, planCorrection: plan };
  },

  async getByScan(scanId: string) {
    return prisma.vulnerabilite.findMany({
      where: { idScan: scanId },
      include: {
        plan: true,
        historiques: true,
      },
      orderBy: { scoreCVSS: 'desc' }
    });
  }
};