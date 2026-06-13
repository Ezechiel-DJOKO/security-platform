// src/app/api/actifs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { Prisma } from '@prisma/client';

interface Actif {
  id: string;
  nom: string;
  type: string;
  adresseIP: string | null;
  criticite: string;
  dernierScan: Date | null;
  createdAt: Date;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const criticite = searchParams.get('criticite') || '';

    // Construction dynamique du where sans type explicite problématique
    const where: Prisma.ActifWhereInput = { deletedAt: null };
    
    if (search) {
      where.OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { adresseIP: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    // Solution 1 : cast via 'as const' puis as unknown
    if (criticite && criticite !== 'Tous') {
      (where as unknown as Record<string, unknown>).criticite = criticite.toUpperCase();
    }

    const actifs = await prisma.actif.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const formatted = actifs.map((a: Actif) => ({
      id: a.id,
      nom: a.nom,
      type: a.type,
      adresseIP: a.adresseIP,
      criticite: a.criticite,
      dernierScan: a.dernierScan ? new Date(a.dernierScan).toLocaleDateString('fr-FR') : 'Jamais',
    }));

    try { await logAuditEvent(session.user.id, "LECTURE", "ACTIF", { count: formatted.length }); } catch {}
    
    return NextResponse.json({ success: true, data: formatted });
  } catch {
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await req.json();
    const actif = await prisma.actif.create({ data: body });

    await logAuditEvent(session.user.id, "CREATION", "ACTIF", { id: actif.id });
    return NextResponse.json({ success: true, data: actif }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: "Erreur création" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await req.json();
    const { id } = body;

    if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });

    const actif = await prisma.actif.update({
      where: { id },
      data: {
        nom: body.nom,
        type: body.type,
        adresseIP: body.adresseIP,
        criticite: body.criticite,
        localisation: body.localisation,
      },
    });

    await logAuditEvent(session.user.id, "MODIFICATION", "ACTIF", { id });
    return NextResponse.json({ success: true, data: actif });
  } catch {
    return NextResponse.json({ success: false, error: "Erreur modification" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { id } = await req.json();

    await prisma.actif.update({ where: { id }, data: { deletedAt: new Date() } });
    await logAuditEvent(session.user.id, "SUPPRESSION", "ACTIF", { id });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Erreur suppression" }, { status: 500 });
  }
}