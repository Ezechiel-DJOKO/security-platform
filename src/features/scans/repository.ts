import { prisma } from '@/lib/prisma';
import { Scan, Vulnerabilite } from '@prisma/client';

export const scanRepository = {
  createScan: async (data: any) => {
    return prisma.scan.create({
      data,
      include: { actif: true, utilisateur: true }
    });
  },

  createVulnerabilites: async (scanId: string, vulnerabilites: any[]) => {
    return prisma.vulnerabilite.createMany({
      data: vulnerabilites.map(v => ({
        idScan: scanId,
        ...v,
        statut: 'OUVERTE'
      }))
    });
  },

  updateActifLastScan: async (idActif: string) => {
    return prisma.actif.update({
      where: { id: idActif },
      data: { dernierScan: new Date() }
    });
  },

  getScans: async () => {
    return prisma.scan.findMany({
      include: { actif: true, vulnerabilites: true },
      orderBy: { createdAt: 'desc' }
    });
  }
};
