import { prisma } from '@/lib/prisma';
import {  StatutVulnerabilite, Prisma } from '@prisma/client';

export const scanRepository = {
  createScan: async (data: unknown) => {
    return prisma.scan.create({
      data: data as Prisma.ScanCreateInput,
      include: { actif: true, utilisateur: true }
    });
  },

  createVulnerabilites: async (scanId: string, vulnerabilites: unknown[]) => {
    return prisma.vulnerabilite.createMany({
      data: vulnerabilites.map(v => ({
        idScan: scanId,
        ...v as Record<string, unknown>,
        statut: (v as Record<string, unknown>).statut ?? StatutVulnerabilite.OUVERTE
      })) as Prisma.VulnerabiliteCreateManyInput[]
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