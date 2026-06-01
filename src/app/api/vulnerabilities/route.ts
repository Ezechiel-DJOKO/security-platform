// src/app/api/vulnerabilities/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

const vulnerabilitySchema = z.object({
  idScan: z.string().uuid(),
  cveId: z.string().optional(),
  titre: z.string().min(3),
  description: z.string().optional(),
  severite: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  scoreCVSS: z.number().min(0).max(10).optional(),
  epssScore: z.number().min(0).max(1).optional(),
  vecteurCVSS: z.string().optional(),
  statut: z.enum(['OUVERTE', 'EN_COURS', 'CORRIGEE', 'IGNORE', 'RISQUE_ACCEPTE', 'VERIFIEE']).default('OUVERTE'),
  assigneA: z.string().uuid().optional().nullable(),
  preuve: z.string().optional(),
  impact: z.string().optional(),
  recommandation: z.string().optional(),
  tags: z.array(z.string()).optional(), // noms des tags
});

// Calcul du Risque Relatif (logique métier)
function calculateRisqueRelatif(scoreCVSS: number | null, epssScore: number | null, severite: string): number {
  if (!scoreCVSS) return 0;

  let baseRisk = scoreCVSS;

  // Pondération EPSS (probabilité d'exploitation)
  if (epssScore) {
    baseRisk += epssScore * 4; // max +4 points
  }

  // Bonus criticité selon sévérité
  const severityMultiplier = {
    CRITICAL: 1.4,
    HIGH: 1.2,
    MEDIUM: 1.0,
    LOW: 0.7
  }[severite] || 1.0;

  let risque = baseRisk * severityMultiplier;

  // Normalisation entre 0 et 10
  return Math.min(Math.max(Math.round(risque * 10) / 10, 0), 10);
}

// GET - Inventaire centralisé avec filtres puissants
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { searchParams } = new URL(req.url);

  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const skip = (page - 1) * limit;

  const filters: any = {};

  // Filtres basiques
  if (searchParams.get('severite')) filters.severite = searchParams.get('severite')?.split(',');
  if (searchParams.get('statut')) filters.statut = searchParams.get('statut')?.split(',');
  if (searchParams.get('assigneA')) filters.assigneA = searchParams.get('assigneA');
  if (searchParams.get('cveId')) filters.cveId = { contains: searchParams.get('cveId') };
  if (searchParams.get('idScan')) filters.idScan = searchParams.get('idScan');

  // Recherche texte
  const search = searchParams.get('search');
  if (search) {
    filters.OR = [
      { titre: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { cveId: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Tags
  const tags = searchParams.get('tags')?.split(',');
  if (tags) {
    filters.tags = { some: { tag: { nom: { in: tags } } } };
  }

  // Score CVSS
  const minScore = searchParams.get('minScore');
  const maxScore = searchParams.get('maxScore');
  if (minScore || maxScore) {
    filters.scoreCVSS = {};
    if (minScore) filters.scoreCVSS.gte = parseFloat(minScore);
    if (maxScore) filters.scoreCVSS.lte = parseFloat(maxScore);
  }

  const vulnerabilities = await prisma.vulnerabilite.findMany({
    where: filters,
    include: {
      scan: { select: { id: true, type: true, cible: true } },
      assigne: { select: { id: true, nom: true, prenom: true } },
      tags: { include: { tag: true } },
    },
    orderBy: [
      { risqueRelatif: 'desc' },
      { scoreCVSS: 'desc' },
    ],
    skip,
    take: limit,
  });

  const total = await prisma.vulnerabilite.count({ where: filters });

  return NextResponse.json({
    data: vulnerabilities,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  });
}

// POST - Création avec tags + calcul risque relatif
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const body = await req.json();
    const validated = vulnerabilitySchema.parse(body);

    const risqueRelatif = calculateRisqueRelatif(
      validated.scoreCVSS || null,
      validated.epssScore || null,
      validated.severite
    );

    const vulnerability = await prisma.vulnerabilite.create({
      data: {
        ...validated,
        risqueRelatif,
        tags: validated.tags ? {
          create: validated.tags.map(tagName => ({
            tag: {
              connectOrCreate: {
                where: { nom: tagName },
                create: { nom: tagName }
              }
            }
          }))
        } : undefined
      },
      include: {
        scan: true,
        assigne: true,
        tags: { include: { tag: true } }
      }
    });

    return NextResponse.json(vulnerability, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}