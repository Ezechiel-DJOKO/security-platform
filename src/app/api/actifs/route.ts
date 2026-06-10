// src/app/api/actifs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: NextRequest) {
  // ... (garde le GET que tu avais, je te le remets complet)
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const criticite = searchParams.get('criticite') || '';

    const where: any = { deletedAt: null };
    if (search) {
      where.OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { adresseIP: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (criticite && criticite !== 'Tous') where.criticite = criticite.toUpperCase();

    const actifs = await prisma.actif.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const formatted = actifs.map((a: any) => ({
      id: a.id,
      nom: a.nom,
      type: a.type,
      adresseIP: a.adresseIP,
      criticite: a.criticite,
      dernierScan: a.dernierScan ? new Date(a.dernierScan).toLocaleDateString('fr-FR') : 'Jamais',
    }));

    try { await logAuditEvent(session.user.id, "LECTURE", "ACTIF", { count: formatted.length }); } catch {}
    
    return NextResponse.json({ success: true, data: formatted });
  } catch (e) {
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // Création (déjà bon)
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await req.json();
    const actif = await prisma.actif.create({ data: body });

    await logAuditEvent(session.user.id, "CREATION", "ACTIF", { id: actif.id });
    return NextResponse.json({ success: true, data: actif }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ success: false, error: "Erreur création" }, { status: 500 });
  }
}

// === NOUVEAU : Gestion PUT et DELETE dans le même fichier ===
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await req.json();
    const { id } = body;   // On envoie l'id dans le body

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
  } catch (e) {
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
  } catch (e) {
    return NextResponse.json({ success: false, error: "Erreur suppression" }, { status: 500 });
  }
}