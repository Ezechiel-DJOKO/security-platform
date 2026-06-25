import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

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

    if (criticite && criticite !== 'Tous') {
      where.criticite = criticite.toUpperCase();
    }

    const actifs = await prisma.actif.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Correction importante : on garde la date brute (ISO)
    const formatted = actifs.map((a) => ({
      id: a.id,
      nom: a.nom,
      type: a.type,
      adresseIP: a.adresseIP,
      criticite: a.criticite,
      dernierScan: a.dernierScan ? a.dernierScan.toISOString() : null, // ← Important
    }));

    await logAuditEvent(session.user.id, "LECTURE", "ACTIF", { count: formatted.length }).catch(() => {});

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: any) {
    console.error("Erreur GET actifs:", error);
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}

// Les autres méthodes (POST, PUT, DELETE) restent identiques
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await req.json();
    const actif = await prisma.actif.create({ data: body });

    await logAuditEvent(session.user.id, "CREATION", "ACTIF", { id: actif.id }).catch(() => {});

    return NextResponse.json({ success: true, data: actif }, { status: 201 });
  } catch (error: any) {
    console.error("Erreur POST actif:", error);
    return NextResponse.json({ success: false, error: "Erreur création" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await req.json();
    const { id } = body;
    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

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

    await logAuditEvent(session.user.id, "MODIFICATION", "ACTIF", { id }).catch(() => {});

    return NextResponse.json({ success: true, data: actif });
  } catch (error: any) {
    console.error("Erreur PUT actif:", error);
    return NextResponse.json({ success: false, error: "Erreur modification" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });

    await prisma.actif.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    await logAuditEvent(session.user.id, "SUPPRESSION", "ACTIF", { id }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Erreur DELETE actif:", error);
    return NextResponse.json({ success: false, error: "Erreur suppression" }, { status: 500 });
  }
}