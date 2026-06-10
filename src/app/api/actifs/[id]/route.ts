// src/app/api/actifs/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

// PUT - Modifier un actif
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();

    const actif = await prisma.actif.update({
      where: { id },
      data: {
        nom: body.nom,
        type: body.type,
        adresseIP: body.adresseIP,
        hostname: body.hostname,
        criticite: body.criticite,
        localisation: body.localisation,
      },
    });

    await logAuditEvent(
      session.user.id, 
      "MODIFICATION", 
      "ACTIF", 
      { id: actif.id, nom: actif.nom }
    );

    return NextResponse.json({ success: true, data: actif });
  } catch (error) {
    console.error("Erreur PUT actif:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Erreur lors de la modification" 
    }, { status: 500 });
  }
}

// DELETE - Supprimer un actif (soft delete)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { id } = params;

    await prisma.actif.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await logAuditEvent(
      session.user.id, 
      "SUPPRESSION", 
      "ACTIF", 
      { id }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur DELETE actif:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Erreur lors de la suppression" 
    }, { status: 500 });
  }
}