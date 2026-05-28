import { PrismaClient, StatutScan, StatutVulnerabilite, TypeScan, OutilScan, Severite, RoleUtilisateur } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Configuration simple et stable
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function saveScanResult({
  idActif,
  lancerPar,
  type,
  outil,
  resultatBrut = null,
  metadata = null,
  vulnerabilites = [],
  duree = 0,
}: {
  idActif: string;
  lancerPar: string;
  type: TypeScan;
  outil: OutilScan;
  resultatBrut?: any;
  metadata?: any;
  vulnerabilites: any[];
  duree?: number;
}) {
  return await prisma.$transaction(async (tx) => {
    const scan = await tx.scan.create({
      data: {
        idActif,
        lancerPar,
        type,
        outil,
        statut: StatutScan.TERMINE,
        debut: new Date(),
        fin: new Date(),
        duree,
        resultatBrut,
        metadata,
      },
    });

    if (vulnerabilites.length > 0) {
      await tx.vulnerabilite.createMany({
        data: vulnerabilites.map((v: any) => ({
          idScan: scan.id,
          cveId: v.cveId || null,
          titre: v.titre,
          description: v.description || null,
          severite: v.severite || Severite.MEDIUM,
          scoreCVSS: v.scoreCVSS || null,
          preuve: v.preuve || null,
          recommandation: v.recommandation || null,
          statut: StatutVulnerabilite.OUVERTE,
        })),
      });
    }

    await tx.actif.update({
      where: { id: idActif },
      data: { dernierScan: new Date() },
    });

    return scan;
  });
}