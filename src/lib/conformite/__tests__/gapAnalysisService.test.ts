// src/lib/conformite/__tests__/gapAnalysisService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { calculateGapAnalysis } from '../gapAnalysisService';
import { prisma } from '@/lib/prisma';
import { StatutConformite } from '@prisma/client';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    controlConformite: {
      findMany: vi.fn(),
    },
  },
}));

const mockedFindMany = vi.mocked(prisma.controlConformite.findMany);

// Interface complète correspondant au type Prisma avec les relations
interface MockControlConformite {
  id: string;
  referentiel: string;
  code: string;
  nom: string;
  description: string;
  domaine: string | null;
  theme: string;
  ponderation: number;
  statut: StatutConformite;
  vulnerabilites: Array<{ niveauPertinence: number }>;
  // Ajoutez ici d'autres champs requis par Prisma si nécessaire
  createdAt?: Date;
  updatedAt?: Date;
}

describe('Gap Analysis Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait calculer correctement le score global et par domaine', async () => {
    mockedFindMany.mockResolvedValue([
      {
        id: 'ctrl-1',
        referentiel: 'ISO27001',
        code: '8.8',
        nom: 'Gestion des vulnérabilités techniques',
        description: 'Description du contrôle',
        domaine: 'Contrôles technologiques',
        theme: 'Gestion des vulnérabilités',
        ponderation: 15,
        statut: StatutConformite.NON_CONFORME,
        vulnerabilites: [
          { niveauPertinence: 90 },
          { niveauPertinence: 85 },
        ],
      },
      {
        id: 'ctrl-2',
        referentiel: 'ISO27001',
        code: '5.1',
        nom: 'Politiques de sécurité de l\'information',
        description: 'Description du contrôle',
        domaine: 'Contrôles organisationnels',
        theme: 'Gouvernance',
        ponderation: 12,
        statut: StatutConformite.CONFORME,
        vulnerabilites: [],
      },
      {
        id: 'ctrl-3',
        referentiel: 'ISO27001',
        code: '8.5',
        nom: 'Authentification sécurisée',
        description: 'Description du contrôle',
        domaine: 'Contrôles technologiques',
        theme: 'Authentification',
        ponderation: 10,
        statut: StatutConformite.PARTIELLEMENT,
        vulnerabilites: [{ niveauPertinence: 75 }],
      },
    ] as unknown as MockControlConformite[]);

    const result = await calculateGapAnalysis();

    expect(result).toBeDefined();
    expect(result.scoreGlobal).toBeGreaterThanOrEqual(0);
    expect(result.scoreGlobal).toBeLessThanOrEqual(100);
    expect(result.totalControles).toBe(3);
    expect(result.domaines.length).toBe(2);

    // Vérification du domaine technologique (le plus impacté)
    const techDomain = result.domaines.find(d => d.domaine === 'Contrôles technologiques');
    expect(techDomain).toBeDefined();
    expect(techDomain!.controlesNonConformes).toBe(2);
    expect(techDomain!.vulnsLiees).toBe(3);
    expect(techDomain!.score).toBeLessThan(70); // Impacté par les vulnérabilités
  });

  it('devrait retourner un score à 0 quand il n\'y a aucun contrôle', async () => {
    mockedFindMany.mockResolvedValue([]);

    const result = await calculateGapAnalysis();

    expect(result.scoreGlobal).toBe(0);
    expect(result.totalControles).toBe(0);
    expect(result.domaines).toEqual([]);
  });

  it('devrait bien gérer la pondération des contrôles', async () => {
    mockedFindMany.mockResolvedValue([
      {
        id: '1',
        referentiel: 'ISO27001',
        code: '1.1',
        nom: 'Contrôle test',
        description: 'Description',
        domaine: 'Contrôles technologiques',
        theme: 'Test',
        ponderation: 20,
        statut: StatutConformite.CONFORME,
        vulnerabilites: [],
      },
      {
        id: '2',
        referentiel: 'ISO27001',
        code: '1.2',
        nom: 'Contrôle test 2',
        description: 'Description',
        domaine: 'Contrôles technologiques',
        theme: 'Test',
        ponderation: 5,
        statut: StatutConformite.NON_CONFORME,
        vulnerabilites: [],
      },
    ] as unknown as MockControlConformite[]);

    const result = await calculateGapAnalysis();

    expect(result.scoreGlobal).toBeLessThan(100);
    expect(result.scoreGlobal).toBeGreaterThan(70); // Pondération forte sur le contrôle conforme
  });

  it('devrait gérer correctement le statut NON_EVALUE', async () => {
    mockedFindMany.mockResolvedValue([
      {
        id: '1',
        referentiel: 'ISO27001',
        code: '1.1',
        nom: 'Contrôle test',
        description: 'Description',
        domaine: 'Contrôles organisationnels',
        theme: 'Test',
        ponderation: 10,
        statut: StatutConformite.NON_EVALUE,
        vulnerabilites: [],
      },
    ] as unknown as MockControlConformite[]);

    const result = await calculateGapAnalysis();

    expect(result.scoreGlobal).toBeLessThan(50); // Score faible pour NON_EVALUE
  });
});