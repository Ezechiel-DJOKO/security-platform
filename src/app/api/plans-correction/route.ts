import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { StatutPlan, Severite, Priorite } from '@prisma/client';

// ============================================================
// DÉLAIS PAR SÉVÉRITÉ
// ============================================================

const DELAIS_JOURS: Record<Severite, number> = {
  CRITICAL : 2,
  HIGH     : 7,
  MEDIUM   : 30,
  LOW      : 90,
};

const PRIORITE_MAP: Record<Severite, Priorite> = {
  CRITICAL : Priorite.CRITIQUE,
  HIGH     : Priorite.HAUTE,
  MEDIUM   : Priorite.MOYENNE,
  LOW      : Priorite.BASSE,
};

function calculerDateEcheance(severite: Severite, dateDepart?: Date): Date {
  const base  = dateDepart ?? new Date();
  const jours = DELAIS_JOURS[severite];
  const date  = new Date(base);
  date.setDate(date.getDate() + jours);
  return date;
}

function calculerUrgence(dateEcheance: Date, severite: string) {
  const jours = Math.ceil(
    (dateEcheance.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const seuilUrgent: Record<string, number> = {
    CRITICAL: 1, HIGH: 2, MEDIUM: 7, LOW: 14,
  };

  let urgence: string;
  if (jours < 0)  urgence = 'EN_RETARD';
  else if (jours <= (seuilUrgent[severite] ?? 2)) urgence = 'URGENT';
  else if (jours <= (seuilUrgent[severite] ?? 2) * 2) urgence = 'NORMAL';
  else urgence = 'OK';

  const tempsRestant = jours < 0
    ? `${Math.abs(jours)}j de retard`
    : jours === 0 ? "Aujourd'hui !"
    : jours === 1 ? '1 jour'
    : jours < 30  ? `${jours} jours`
    : `${Math.floor(jours / 30)} mois`;

  return { jours, urgence, tempsRestant };
}

// ============================================================
// GET
// ============================================================

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mesPlans  = searchParams.get('mesPlans') === 'true';
    const severite  = searchParams.get('severite');
    const statut    = searchParams.get('statut');
    const urgence   = searchParams.get('urgence');  // EN_RETARD | URGENT

    let whereClause: any = {
      vulnerabilite: { deletedAt: null }
    };

    // Filtrage par rôle
    if (mesPlans) {
      if (session.user.role === 'TECHNICIEN') {
        whereClause.assigneA = session.user.id;
      } else if (session.user.role === 'AUDITEUR') {
        whereClause.createdBy = session.user.id;
      }
    }

    // Filtres optionnels
    if (severite) {
      whereClause.vulnerabilite = {
        ...whereClause.vulnerabilite,
        severite,
      };
    }
    if (statut) {
      whereClause.statut = statut;
    }

    const plans = await prisma.planCorrection.findMany({
      where  : whereClause,
      include: {
        vulnerabilite: {
  select: {
    id       : true,
    titre    : true,
    severite : true,
    statut   : true,
    scoreCVSS: true,
    idActif  : true,  // ← Ajouté
    idScan   : true,  // ← Ajouté
  }
},
        assigne: {
          select: { id: true, nom: true, prenom: true, email: true }
        },
        createur: {
          select: { id: true, nom: true, prenom: true }
        },
      },
      orderBy: { dateEcheance: 'asc' },  // Plus urgent en premier
    });

    // Enrichir avec urgence et retard
    const enriched = plans.map(plan => {
      const { jours, urgence: u, tempsRestant } = calculerUrgence(
        plan.dateEcheance,
        plan.vulnerabilite?.severite ?? 'MEDIUM'
      );

      const estEnRetard =
        !['TERMINE', 'VERIFIE', 'ANNULE'].includes(plan.statut) &&
        jours < 0;

      return {
        ...plan,
        joursRestants : jours,
        urgence       : u,
        tempsRestant,
        estEnRetard,
        statutAffiche : estEnRetard ? 'EN_RETARD' : plan.statut,
        // Info délai de référence
        delaiReference: plan.vulnerabilite?.severite
          ? DELAIS_JOURS[plan.vulnerabilite.severite as Severite]
          : null,
      };
    });

    // Filtrer par urgence si demandé
    const filtered = urgence
      ? enriched.filter(p => p.urgence === urgence || (urgence === 'EN_RETARD' && p.estEnRetard))
      : enriched;

    // Stats
    const stats = {
      total      : filtered.length,
      enRetard   : filtered.filter(p => p.estEnRetard).length,
      urgent     : filtered.filter(p => p.urgence === 'URGENT').length,
      aFaire     : filtered.filter(p => p.statut === 'A_FAIRE').length,
      enCours    : filtered.filter(p => p.statut === 'EN_COURS').length,
      termine    : filtered.filter(p => p.statut === 'TERMINE').length,
    };

    return NextResponse.json({
      success: true,
      data   : filtered,
      stats,
      count  : filtered.length,
    });

  } catch (error) {
    console.error("Erreur GET /api/plans-correction:", error);
    return NextResponse.json({
      success: false,
      error  : "Erreur serveur"
    }, { status: 500 });
  }
}

// ============================================================
// POST — Création manuelle (MEDIUM + LOW)
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    if (!['ADMIN', 'AUDITEUR'].includes(session.user.role)) {
      return NextResponse.json({
        error: "Seul l'Admin ou l'Auditeur peut créer un plan"
      }, { status: 403 });
    }

    const body = await request.json();

    if (
      !body.vulnerabiliteIds ||
      !Array.isArray(body.vulnerabiliteIds) ||
      body.vulnerabiliteIds.length === 0
    ) {
      return NextResponse.json(
        { error: "Au moins une vulnérabilité est requise" },
        { status: 400 }
      );
    }

    const plansCrees = [];
    const erreurs    = [];

    for (const idVuln of body.vulnerabiliteIds) {
      try {
        // Récupérer la vulnérabilité pour calculer la date automatiquement
        const vuln = await prisma.vulnerabilite.findUnique({
          where: { id: idVuln }
        });

        if (!vuln) {
          erreurs.push({ id: idVuln, error: 'Vulnérabilité introuvable' });
          continue;
        }

        // Date d'échéance : manuelle OU calculée selon sévérité
        const dateEcheance = body.dateEcheance
          ? new Date(body.dateEcheance)
          : calculerDateEcheance(
              vuln.severite as Severite,
              vuln.dateDecouverte
            );

        // Priorité : manuelle OU selon sévérité
        const priorite = body.priorite
          ?? PRIORITE_MAP[vuln.severite as Severite];

        const plan = await prisma.$transaction(async (tx) => {
          const p = await tx.planCorrection.create({
            data: {
              idVulnerabilite : idVuln,
              assigneA        : body.assigneA ?? null,
              priorite,
              dateEcheance,
              statut          : StatutPlan.A_FAIRE,
              commentaire     : body.commentaire ?? null,
              createdBy       : session.user.id,
            },
            include: {
              vulnerabilite: {
                select: { titre: true, severite: true }
              },
              assigne: {
                select: { nom: true, prenom: true }
              },
            }
          });

          // Passer la vuln EN_COURS
          await tx.vulnerabilite.update({
            where: { id: idVuln },
            data : { statut: 'EN_COURS' },
          });

          return p;
        });

        plansCrees.push(plan);
        console.log(
          `[PLAN MANUEL] ✅ "${vuln.titre}" | ${vuln.severite} | ` +
          `Échéance: ${dateEcheance.toLocaleDateString('fr-FR')}`
        );

      } catch (err: any) {
        erreurs.push({ id: idVuln, error: err.message });
      }
    }

    return NextResponse.json({
      success : true,
      message : `${plansCrees.length} plan(s) créé(s)`,
      data    : plansCrees,
      erreurs : erreurs.length > 0 ? erreurs : undefined,
    }, { status: 201 });

  } catch (error: any) {
    console.error("Erreur POST /api/plans-correction:", error);
    return NextResponse.json({
      success: false,
      error  : error.message
    }, { status: 500 });
  }
}