import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { TypeActif, NiveauCriticite } from '@prisma/client';

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
        { hostname: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (criticite && criticite !== 'Tous') {
      where.criticite = criticite.toUpperCase();
    }

    const actifs = await prisma.actif.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const formatted = actifs.map((a) => ({
      id: a.id,
      nom: a.nom,
      type: a.type,
      adresseIP: a.adresseIP,
      hostname: a.hostname,
      localisation: a.localisation,
      criticite: a.criticite,
      dernierScan: a.dernierScan ? a.dernierScan.toISOString() : null,
    }));

    await logAuditEvent(session.user.id, "LECTURE", "ACTIF", { count: formatted.length }).catch(() => {});

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: any) {
    console.error("Erreur GET actifs:", error);
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}

// ==================== POST - Création ====================
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await req.json();

    // ✅ Correction : On ajoute une criticité par défaut
    const data = {
      nom: body.nom,
      type: body.type as TypeActif,
      adresseIP: body.adresseIP || null,
      hostname: body.hostname || null,
      localisation: body.localisation || null,
      criticite: (body.criticite as NiveauCriticite) || NiveauCriticite.MOYEN, // Valeur par défaut
    };

    const actif = await prisma.actif.create({ data });

    await logAuditEvent(session.user.id, "CREATION", "ACTIF", { 
      id: actif.id, 
      nom: actif.nom 
    }).catch(() => {});

    return NextResponse.json({ 
      success: true, 
      data: actif 
    }, { status: 201 });

  } catch (error: any) {
    console.error("Erreur POST actif:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || "Erreur lors de la création de l'actif" 
    }, { status: 500 });
  }
}

// ==================== PUT - Modification ====================
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

    // Gestion propre de la criticité (vide = NULL)
    let criticiteData = undefined;
    if (body.criticite && body.criticite !== '') {
      criticiteData = body.criticite as NiveauCriticite;
    }

    const actif = await prisma.actif.update({
      where: { id },
      data: {
        nom: body.nom,
        type: body.type,
        adresseIP: body.adresseIP || null,
        hostname: body.hostname || null,
        localisation: body.localisation || null,
        criticite: criticiteData,   // ← NULL si vide
      },
    });

    await logAuditEvent(session.user.id, "MODIFICATION", "ACTIF", { id }).catch(() => {});

    return NextResponse.json({ success: true, data: actif });

  } catch (error: any) {
    console.error("Erreur PUT actif:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || "Erreur lors de la modification" 
    }, { status: 500 });
  }
}

// ==================== DELETE (Soft Delete) ====================
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