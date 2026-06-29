import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { StatutPlan, Severite, Priorite } from '@prisma/client';

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
// GET — Liste des plans (Version Finale)
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mesPlans = searchParams.get('mesPlans') === 'true';
    const severite = searchParams.get('severite');
    const statut = searchParams.get('statut');
    const urgence = searchParams.get('urgence');

    let whereClause: any = {
      vulnerabilite: { deletedAt: null }
    };

    if (mesPlans) {
      if (session.user.role === 'TECHNICIEN') {
        whereClause.assigneA = session.user.id;
      } else if (session.user.role === 'AUDITEUR') {
        whereClause.createdBy = session.user.id;
      }
    }

    if (severite) {
      whereClause.vulnerabilite = { ...whereClause.vulnerabilite, severite };
    }
    if (statut) {
      whereClause.statut = statut;
    }

    const plans = await prisma.planCorrection.findMany({
      where: whereClause,
      include: {
        vulnerabilite: {
          select: { id: true, titre: true, severite: true, statut: true }
        },
        assigne: {
          select: { id: true, nom: true, prenom: true, email: true }
        },
        createur: {
          select: { id: true, nom: true, prenom: true }
        },
      },
      orderBy: { dateEcheance: 'asc' },
    });

    // Enrichissement
    const enriched = plans.map(plan => {
      const dateEcheance = new Date(plan.dateEcheance);
      const jours = Math.ceil((dateEcheance.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      const estEnRetard = !['TERMINE', 'VERIFIE', 'ANNULE'].includes(plan.statut) && jours < 0;

      let urgenceCalc = 'NORMAL';
      if (estEnRetard) urgenceCalc = 'EN_RETARD';
      else if (jours <= 2) urgenceCalc = 'URGENT';

      return {
        ...plan,
        joursRestants: jours,
        estEnRetard,
        urgence: urgenceCalc,
        statutAffiche: estEnRetard ? 'EN_RETARD' : plan.statut,
      };
    });

    // Filtrage par urgence / statut
    const filtered = urgence
      ? enriched.filter(p => 
          (urgence === 'EN_RETARD' && p.estEnRetard) || 
          p.urgence === urgence
        )
      : enriched;

    // Statistiques
    const stats = {
      total: filtered.length,
      enRetard: enriched.filter(p => p.estEnRetard).length,
      urgent: enriched.filter(p => p.urgence === 'URGENT').length,
      aFaire: enriched.filter(p => p.statut === 'A_FAIRE').length,
      enCours: enriched.filter(p => p.statut === 'EN_COURS').length,
      termine: enriched.filter(p => p.statut === 'TERMINE').length,
      verifie: enriched.filter(p => p.statut === 'VERIFIE').length,
    };

    return NextResponse.json({
      success: true,
      data: filtered,
      stats,
      count: filtered.length,
    });

  } catch (error: any) {
    console.error("Erreur GET /api/plans-correction:", error);
    return NextResponse.json({
      success: false,
      error: "Erreur serveur"
    }, { status: 500 });
  }
}

// ============================================================
// POST 
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

        const assigneA = body.assigneA || session.user.id;
        const dateEcheance = body.dateEcheance
          ? new Date(body.dateEcheance)
          : calculerDateEcheance(vuln.severite as Severite, vuln.dateDecouverte);

        const priorite = body.priorite ?? PRIORITE_MAP[vuln.severite as Severite];

        const plan = await prisma.$transaction(async (tx) => {
          const p = await tx.planCorrection.create({
            data: {
              idVulnerabilite: idVuln,
              assigneA,
              priorite,
              dateEcheance,
              statut: StatutPlan.A_FAIRE,
              commentaire: body.commentaire ?? null,
              createdBy: session.user.id,
            },
            include: {
              vulnerabilite: { select: { titre: true, severite: true } },
              assigne: { select: { nom: true, prenom: true, email: true } },
            }
          });

          await tx.vulnerabilite.update({
            where: { id: idVuln },
            data: { statut: 'EN_COURS' },
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