// src/app/api/vulnerabilities/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { Prisma, Severite, StatutVulnerabilite } from '@prisma/client';

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
  tags: z.array(z.string()).optional(),
});

function calculateRisqueRelatif(scoreCVSS: number | null, epssScore: number | null, severite: string): number {
  if (!scoreCVSS) return 0;
  let baseRisk = scoreCVSS;
  if (epssScore) baseRisk += epssScore * 4;
  const severityMultiplier: Record<string, number> = { CRITICAL: 1.4, HIGH: 1.2, MEDIUM: 1.0, LOW: 0.7 };
  const risque = baseRisk * (severityMultiplier[severite] || 1.0);
  return Math.min(Math.max(Math.round(risque * 10) / 10, 0), 10);
}

// ─── Helpers pour cast les enums ───────────────────────

const isSeverite = (s: string): s is Severite => 
  ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(s);

const isStatutVulnerabilite = (s: string): s is StatutVulnerabilite =>
  ['OUVERTE', 'EN_COURS', 'CORRIGEE', 'IGNORE', 'RISQUE_ACCEPTE', 'VERIFIEE'].includes(s);

// GET
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const skip = (page - 1) * limit;

  const where: Prisma.VulnerabiliteWhereInput = {};

  const severiteParam = searchParams.get('severite');
  if (severiteParam) {
    const severites = severiteParam.split(',').filter(isSeverite);
    if (severites.length > 0) where.severite = { in: severites };
  }

  const statutParam = searchParams.get('statut');
  if (statutParam) {
    const statuts = statutParam.split(',').filter(isStatutVulnerabilite);
    if (statuts.length > 0) where.statut = { in: statuts };
  }

  const assigneA = searchParams.get('assigneA');
  if (assigneA) where.assigneA = assigneA;

  const idScan = searchParams.get('idScan');
  if (idScan) where.idScan = idScan;

  const cveId = searchParams.get('cveId');
  if (cveId) where.cveId = { contains: cveId };

  const search = searchParams.get('search');
  if (search) {
    where.OR = [
      { titre: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { cveId: { contains: search, mode: 'insensitive' } },
    ];
  }

  const tags = searchParams.get('tags')?.split(',');
  if (tags && tags.length > 0) {
    where.tags = { some: { tag: { nom: { in: tags } } } };
  }

  // Score range
  const minScore = searchParams.get('minScore');
  const maxScore = searchParams.get('maxScore');
  if (minScore || maxScore) {
    where.scoreCVSS = {};
    if (minScore) where.scoreCVSS.gte = parseFloat(minScore);
    if (maxScore) where.scoreCVSS.lte = parseFloat(maxScore);
  }

  const [vulnerabilities, total] = await Promise.all([
    prisma.vulnerabilite.findMany({
      where,
      include: {
        scan: { select: { id: true, type: true, cible: true, outil: true } },
        assigne: { select: { id: true, nom: true, prenom: true } },
        tags: { include: { tag: true } },
      },
      orderBy: [
        { risqueRelatif: 'desc' },
        { scoreCVSS: 'desc' },
        { dateDecouverte: 'desc' }
      ],
      skip,
      take: limit,
    }),
    prisma.vulnerabilite.count({ where }),
  ]);

  return NextResponse.json({
    data: vulnerabilities,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  });
}

// POST
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
          create: validated.tags.map(name => ({
            tag: { connectOrCreate: { where: { nom: name }, create: { nom: name } } }
          }))
        } : undefined,
      },
      include: {
        scan: true,
        assigne: true,
        tags: { include: { tag: true } }
      }
    });

    return NextResponse.json(vulnerability, { status: 201 });
  } catch (error: unknown) {
    console.error(error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}