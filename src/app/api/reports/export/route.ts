// src/app/api/reports/export/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'json';
  const mesRapports = searchParams.get('mesRapports') === 'true';
  const type = searchParams.get('type') || 'general';

  try {
    let data: any = { success: true };

    if (mesRapports) {
      // === RAPPORT PERSONNEL ===
      if (session.user.role === 'TECHNICIEN') {
        data = await getTechnicienReport(session.user.id);
      } else {
        data = await getPersonalReport(session.user.id, session.user.role);
      }
    } else if (type === 'audit') {
      // === RAPPORT D'AUDIT (pour Auditeur principalement) ===
      data = await getAuditReport();
    } else {
      // === RAPPORT GLOBAL (Admin & Superviseur) ===
      data = await getGlobalReport(session.user.role);
    }

    if (format === 'xlsx' || format === 'pdf') {
      return NextResponse.json({ message: "Export bientôt disponible" }, { status: 501 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Erreur API Rapports:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// ==================== FONCTIONS PAR RÔLE ====================
async function getTechnicienReport(userId: string) {
  const vulns = await prisma.vulnerabilite.findMany({
    where: { assigneA: userId, deletedAt: null },
    orderBy: { updatedAt: 'desc' },
    include: { plan: true }
  });

  return {
    success: true,
    metadata: { typeRapport: "Mes Corrections" },
    statistiques: {
      total: vulns.length,
      corrigees: vulns.filter(v => ['CORRIGEE', 'VERIFIEE'].includes(v.statut)).length,
      restantes: vulns.filter(v => !['CORRIGEE', 'VERIFIEE'].includes(v.statut)).length,
    },
    vulnerabilites: vulns
  };
}

async function getPersonalReport(userId: string, role: string) {
  const vulns = await prisma.vulnerabilite.findMany({
    where: { deletedAt: null },
    take: 80,
    orderBy: { updatedAt: 'desc' }
  });

  return {
    success: true,
    metadata: { typeRapport: `Rapport Personnel - ${role}` },
    statistiques: { total: vulns.length },
    vulnerabilites: vulns
  };
}

async function getAuditReport() {
  const vulns = await prisma.vulnerabilite.findMany({
    where: { deletedAt: null },
    take: 100,
    orderBy: { updatedAt: 'desc' }
  });

  return {
    success: true,
    metadata: { typeRapport: "Rapport d'Audit" },
    statistiques: { total: vulns.length },
    vulnerabilites: vulns
  };
}

async function getGlobalReport(role: string) {
  const vulns = await prisma.vulnerabilite.findMany({
    where: { deletedAt: null },
    take: 150,
    orderBy: { updatedAt: 'desc' }
  });

  return {
    success: true,
    metadata: { typeRapport: "Rapport Global" },
    statistiques: { total: vulns.length },
    vulnerabilites: vulns
  };
}