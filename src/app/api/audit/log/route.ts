export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { Session } from 'next-auth';
import { TypeAction } from '@prisma/client'; 
import { EntiteCible } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession() as Session | null;
    const { userId, action, resource, details } = await req.json() as {
      userId?: string;
      action: string;
      resource: string;
      details?: Record<string, unknown>;
    };

    // Récupération sécurisée de l'IP
    const ipAdresse = 
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      null;

    await prisma.auditLog.create({
      data: {
        idUtilisateur: userId || session?.user?.id || null,
        action: TypeAction.CREATE,
        entite: EntiteCible.VULNERABILITY,
        idEntite: null,
        details: {
            scanId: scanId,
            vulnerabilityId: vulnId},
        ipAdresse: ipAdresse,
        userAgent: req.headers.get('user-agent') || null,
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Audit log error:', error);
    return NextResponse.json({ error: 'Failed to log audit' }, { status: 500 });
  }
}