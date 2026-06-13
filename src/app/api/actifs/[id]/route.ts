import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

// PUT - Modifier un actif
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const actifMisAJour = await prisma.actif.update({
      where: { id },
      data: body,
    });

    await logAuditEvent(
      (await getServerSession(authOptions))?.user?.id || '', 
      "MODIFICATION", 
      "ACTIF", 
      { id }
    ).catch(() => {});

    return NextResponse.json({
      success: true,
      data: actifMisAJour
    });
  } catch (error: any) {
    console.error("Erreur PUT actif:", error);
    return NextResponse.json({
      error: error.message || "Erreur lors de la mise à jour"
    }, { status: 500 });
  }
}

// DELETE - Supprimer un actif (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }   // ← Correction
) {
  try {
    const { id } = await params;   // ← Correction importante

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

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
  } catch (error: any) {
    console.error("Erreur DELETE actif:", error);
    return NextResponse.json({
      success: false,
      error: "Erreur lors de la suppression"
    }, { status: 500 });
  }
}