import { TypeScan, OutilScan, StatutScan, Severite } from '@prisma/client';

export type ScanInput = {
  idActif: string;
  type: TypeScan;
  outil: OutilScan;
  userId: string;
  cible?: string;
};

export type VulnerabiliteInput = {
  titre: string;
  description?: string;
  severite: Severite;
  scoreCVSS?: number;
  cveId?: string;
  recommandation?: string;
  preuve?: string;
};

export type ScanResult = {
  id: string;
  statut: StatutScan;
  type: TypeScan;
  outil: OutilScan;
  debut: Date;
  fin?: Date;
  duree?: number;
  vulnerabilitesCount: number;
};
