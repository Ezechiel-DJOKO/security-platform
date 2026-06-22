import { prisma } from '@/lib/prisma';

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
  totalActifs: number;
  lastUpdated: Date;
};

// Define proper types
interface DomainData {
  domaine: string;
  totalControles: number;
  controlesEvalues: number;
  controlesNonConformes: number;
  vulnsLiees: number;
  scoreTotal: number;
}

export async function calculateGapAnalysis(): Promise<GapAnalysisResult> {
  try {
    const totalActifs = await prisma.actif.count();

    const controls = await prisma.controlConformite.findMany({
      where: { referentiel: "ISO27001" },
    });

    const domainMap = new Map<string, DomainData>();

    let scoreGlobalPondere = 0;
    let totalPondere = 0;

    for (const ctrl of controls) {
      const domaine = ctrl.domaine || "Autres";

      if (!domainMap.has(domaine)) {
        domainMap.set(domaine, {
          domaine,
          totalControles: 0,
          controlesEvalues: 0,
          controlesNonConformes: 0,
          vulnsLiees: 0,
          scoreTotal: 0,
        });
      }

      const data = domainMap.get(domaine)!;
      data.totalControles++;

      // Calcul du score selon le statut
      let controlScore = 40; // Valeur par défaut pour NON_EVALUE

      switch (ctrl.statut) {
        case "CONFORME":
          controlScore = 100;
          data.controlesEvalues++;
          break;
        case "PARTIELLEMENT":
          controlScore = 65;
          data.controlesEvalues++;
          break;
        case "NON_CONFORME":
          controlScore = 20;
          data.controlesEvalues++;
          data.controlesNonConformes++;
          break;
        case "NON_EVALUE":
        default:
          controlScore = 40; // On donne un score moyen pour ne pas tout pénaliser
          break;
      }

      data.scoreTotal += controlScore;
      totalPondere += 10;
      scoreGlobalPondere += controlScore * 10;
    }

    // Transformation en tableau de domaines
    const domaines: DomainScore[] = Array.from(domainMap.values()).map((d: DomainData) => ({
      domaine: d.domaine,
      score: d.totalControles ? Math.round(d.scoreTotal / d.totalControles) : 40,
      totalControles: d.totalControles,
      controlesEvalues: d.controlesEvalues || 0,
      controlesNonConformes: d.controlesNonConformes || 0,
      vulnsLiees: d.vulnsLiees || 0,
    }));

    const scoreGlobal = totalPondere 
      ? Math.round(scoreGlobalPondere / totalPondere) 
      : 45;

    return {
      scoreGlobal,
      domaines: domaines.sort((a, b) => b.score - a.score),
      totalControles: controls.length,
      totalActifs,
      lastUpdated: new Date(),
    };
  } catch (error) {
    console.error("Erreur calculateGapAnalysis:", error);
    return {
      scoreGlobal: 45,
      domaines: [],
      totalControles: 0,
      totalActifs: 0,
      lastUpdated: new Date(),
    };
  }
}