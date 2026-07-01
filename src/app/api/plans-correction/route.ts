// src/app/api/plans-correction/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { StatutPlan, StatutVulnerabilite, Severite, Priorite } from '@prisma/client';

// ============================================================
// CONFIG DÉLAIS
// ============================================================
const DELAIS_JOURS: Record<Severite, number> = {
  CRITICAL: 2,
  HIGH: 7,
  MEDIUM: 30,
  LOW: 90,
};

const PRIORITE_MAP: Record<Severite, Priorite> = {
  CRITICAL: Priorite.CRITIQUE,
  HIGH: Priorite.HAUTE,
  MEDIUM: Priorite.MOYENNE,
  LOW: Priorite.BASSE,
};

function calculerDateEcheance(severite: Severite, dateDepart?: Date): Date {
  const base = dateDepart ?? new Date();
  const date = new Date(base);
  date.setDate(date.getDate() + DELAIS_JOURS[severite]);
  return date;
}

// ============================================================
// GET — Liste des plans
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mesPlans = searchParams.get('mesPlans') === 'true';
    const mesTaches = searchParams.get('mesTaches') === 'true';   // ← Nouveau
    const severite = searchParams.get('severite');
    const statut = searchParams.get('statut');

    let whereClause: any = {
      vulnerabilite: { deletedAt: null }
    };

    // Gestion des filtres "Mes Plans" et "Mes Tâches"
    if (mesPlans || mesTaches) {
      if (session.user.role === 'TECHNICIEN') {
        whereClause.assigneA = session.user.id;

        // Pour Mes Tâches : on ne montre que les tâches actives
        if (mesTaches) {
          whereClause.statut = {
            in: [StatutPlan.A_FAIRE, StatutPlan.EN_COURS]
          };
        }
      } 
      else if (['ADMIN', 'AUDITEUR', 'SUPERVISEUR'].includes(session.user.role)) {
        whereClause.createdBy = session.user.id;
      }
    }

    if (severite) whereClause.vulnerabilite.severite = severite;
    if (statut) whereClause.statut = statut;

    const plans = await prisma.planCorrection.findMany({
      where: whereClause,
      include: {
        vulnerabilite: {
          select: { 
            id: true, 
            titre: true, 
            severite: true, 
            statut: true,
            scoreCVSS: true 
          }
        },
        assigne: {
          select: { id: true, nom: true, prenom: true, email: true }
        },
        createur: {
          select: { id: true, nom: true, prenom: true, email: true }
        },
      },
      orderBy: { dateEcheance: 'asc' },
    });

    const enriched = plans.map(plan => ({
      ...plan,
      technicien: plan.assigne
        ? `${plan.assigne.prenom || ''} ${plan.assigne.nom || ''}`.trim()
        : 'Non assigné',
      auditeur: plan.createur
        ? `${plan.createur.prenom || ''} ${plan.createur.nom || ''}`.trim()
        : 'Inconnu',
    }));

    return NextResponse.json({
      success: true,
      data: enriched,
    });
  } catch (error: any) {
    console.error("Erreur GET /api/plans-correction:", error);
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}

// ============================================================
// POST — Création de plans
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    if (!['ADMIN', 'AUDITEUR'].includes(session.user.role)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));

    if (!body.vulnerabiliteIds || !Array.isArray(body.vulnerabiliteIds) || body.vulnerabiliteIds.length === 0) {
      return NextResponse.json({ error: "Au moins une vulnérabilité est requise" }, { status: 400 });
    }

    const plansCrees = [];
    const erreurs = [];

    for (const idVuln of body.vulnerabiliteIds) {
      try {
        const vuln = await prisma.vulnerabilite.findUnique({ where: { id: idVuln } });
        if (!vuln) {
          erreurs.push({ id: idVuln, error: 'Vulnérabilité introuvable' });
          continue;
        }

        const plan = await prisma.$transaction(async (tx) => {
          const p = await tx.planCorrection.create({
            data: {
              idVulnerabilite: idVuln,
              assigneA: body.assigneA || null,
              priorite: body.priorite ?? PRIORITE_MAP[vuln.severite as Severite],
              dateEcheance: body.dateEcheance 
                ? new Date(body.dateEcheance) 
                : calculerDateEcheance(vuln.severite as Severite),
              statut: StatutPlan.A_FAIRE,
              commentaire: body.commentaire ?? null,
              createdBy: session.user.id,
            },
            include: {
              vulnerabilite: true,
              assigne: true,
              createur: true,
            }
          });

          await tx.vulnerabilite.update({
            where: { id: idVuln },
            data: { statut: StatutVulnerabilite.EN_COURS },
          });

          return p;
        });

        plansCrees.push(plan);
      } catch (err: any) {
        erreurs.push({ id: idVuln, error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      message: `${plansCrees.length} plan(s) créé(s)`,
      data: plansCrees,
      erreurs: erreurs.length > 0 ? erreurs : undefined,
    });
  } catch (error: any) {
    console.error("Erreur POST /api/plans-correction:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}