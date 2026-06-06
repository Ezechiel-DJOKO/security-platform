// src/lib/conformite/gapAnalysisService.ts
import { prisma } from '@/lib/prisma';
import { StatutConformite } from '@prisma/client';

export type DomainScore = {
  domaine: string;
  score: number;
  totalControles: number;
  controlesEvalues: number;
  controlesNonConformes: number;
  vulnsLiees: number;
};

export type GapAnalysisResult = {
  scoreGlobal: number;
  domaines: DomainScore[];
  totalControles: number;
  lastUpdated: Date;
};

// Interface pour les données accumulées par domaine
interface DomainAccumulator {
  domaine: string;
  totalControles: number;
  controlesEvalues: number;
  controlesNonConformes: number;
  vulnsLiees: number;
  scoreTotal: number;
  ponderationTotal: number;
}

// Interface pour la vulnérabilité incluse dans le contrôle
interface VulnerabiliteIncluse {
  niveauPertinence: number;
}

// Interface pour le contrôle avec les relations
interface ControlConformiteWithVulns {
  domaine: string | null;
  statut: StatutConformite;
  vulnerabilites: VulnerabiliteIncluse[];
  // Ajoutez ici d'autres champs du modèle Prisma si nécessaire
}

export async function calculateGapAnalysis(): Promise<GapAnalysisResult> {
  const controls = await prisma.controlConformite.findMany({
    where: { referentiel: "ISO27001" },
    include: {
      vulnerabilites: true,
    },
  });

  const domainMap = new Map<string, DomainAccumulator>();

  let totalPondere = 0;
  let scoreGlobalPondere = 0;

  for (const ctrl of controls as ControlConformiteWithVulns[]) {
    const domaine = ctrl.domaine || "Autres";

    if (!domainMap.has(domaine)) {
      domainMap.set(domaine, {
        domaine,
        totalControles: 0,
        controlesEvalues: 0,
        controlesNonConformes: 0,
        vulnsLiees: 0,
        scoreTotal: 0,
        ponderationTotal: 0,
      });
    }

    const data = domainMap.get(domaine)!;
    // Utilisation de l'opérateur nullish coalescing (??) au lieu de || pour une valeur par défaut
    const ponderation = 10; // Valeur par défaut si le champ n'existe pas dans Prisma

    data.totalControles++;
    data.ponderationTotal += ponderation;

    // Calcul du score selon statut
    let controlScore = 100;
    switch (ctrl.statut) {
      case StatutConformite.NON_CONFORME:
        controlScore = 10;
        break;
      case StatutConformite.PARTIELLEMENT:
        controlScore = 50;
        break;
      case StatutConformite.NON_EVALUE:
        controlScore = 35;
        break;
      case StatutConformite.NON_APPLICABLE:
        controlScore = 80;
        break;
      case StatutConformite.CONFORME:
      default:
        controlScore = 100;
    }

    // Impact des vulnérabilités
    if (ctrl.vulnerabilites.length > 0) {
      data.vulnsLiees += ctrl.vulnerabilites.length;
      const avgImpact = ctrl.vulnerabilites.reduce((sum: number, v: VulnerabiliteIncluse) => sum + v.niveauPertinence, 0) / ctrl.vulnerabilites.length;
      controlScore = Math.max(5, controlScore - Math.floor(avgImpact * 0.65));
    }

    data.scoreTotal += controlScore * ponderation;

    if (ctrl.statut !== StatutConformite.NON_EVALUE) {
      data.controlesEvalues++;
    }
    if (ctrl.statut === StatutConformite.NON_CONFORME || ctrl.statut === StatutConformite.PARTIELLEMENT) {
      data.controlesNonConformes++;
    }

    totalPondere += ponderation;
    scoreGlobalPondere += controlScore * ponderation;
  }

  const domaines: DomainScore[] = Array.from(domainMap.values()).map((d: DomainAccumulator) => ({
    domaine: d.domaine,
    score: d.ponderationTotal ? Math.round(d.scoreTotal / d.ponderationTotal) : 0,
    totalControles: d.totalControles,
    controlesEvalues: d.controlesEvalues,
    controlesNonConformes: d.controlesNonConformes,
    vulnsLiees: d.vulnsLiees,
  }));

  const scoreGlobal = totalPondere ? Math.round(scoreGlobalPondere / totalPondere) : 0;

  return {
    scoreGlobal,
    domaines: domaines.sort((a, b) => b.score - a.score),
    totalControles: controls.length,
    lastUpdated: new Date(),
  };
}