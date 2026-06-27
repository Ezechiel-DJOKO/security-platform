// src/app/api/plans-correction/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { StatutPlan, StatutVulnerabilite, TypeAction, EntiteCible } from '@prisma/client';

// ============================================================
// INCLUDE STANDARD
// ============================================================

const PLAN_INCLUDE = {
  vulnerabilite: {
    select: {
      id            : true,
      titre         : true,
      severite      : true,
      statut        : true,
      scoreCVSS     : true,
      idActif       : true,
      idScan        : true,
    }
  },
  assigne: {
    select: { id: true, nom: true, prenom: true, email: true }
  },
  createur: {
    select: { id: true, nom: true, prenom: true }
  },
} as const;

// ============================================================
// RAPPORT DE VÉRIFICATION
// ============================================================

async function generateVerificationReport(
  planId      : string,
  superviseurId: string
) {
  try {
    const plan = await prisma.planCorrection.findUnique({
      where  : { id: planId },
      include: { vulnerabilite: true, assigne: true }
    });

    if (!plan?.vulnerabilite) return;

    // Récupérer l'actif via le scan
    const idActif = plan.vulnerabilite.idActif
      ?? (plan.vulnerabilite.idScan
          ? (await prisma.scan.findUnique({
              where : { id: plan.vulnerabilite.idScan },
              select: { idActif: true }
            }))?.idActif
          : null);

    if (!idActif) {
      console.warn('[RAPPORT] Actif introuvable pour le rapport');
      return;
    }

    const titre = [
      'Vérification Correction —',
      plan.vulnerabilite.titre.substring(0, 60),
      plan.vulnerabilite.titre.length > 60 ? '...' : '',
    ].join(' ').trim();

    await prisma.rapportAudit.create({
      data: {
        generePar  : superviseurId,
        idActif,
        titre,
        description: (
          `Validation de la correction par le superviseur.\n` +
          `Vulnérabilité : ${plan.vulnerabilite.titre}\n` +
          `Sévérité : ${plan.vulnerabilite.severite}\n` +
          `Technicien : ${plan.assigne?.prenom ?? '—'} ${plan.assigne?.nom ?? ''}\n` +
          `Statut final : VERIFIE`
        ),
        format: 'PDF',
      },
    });

    console.log(`[RAPPORT] ✅ Rapport de vérification généré pour le plan ${planId}`);

  } catch (err: any) {
    console.error('[RAPPORT] Erreur génération rapport:', err.message);
  }
}

// ============================================================
// GET — Détail d'un plan
// ============================================================

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = await params;

    const plan = await prisma.planCorrection.findUnique({
      where  : { id },
      include: PLAN_INCLUDE,
    });

    if (!plan) {
      return NextResponse.json({ error: 'Plan non trouvé' }, { status: 404 });
    }

    // Calcul urgence
    const jours = Math.ceil(
      (plan.dateEcheance.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    const estEnRetard =
      !['TERMINE', 'VERIFIE', 'ANNULE'].includes(plan.statut) && jours < 0;

    return NextResponse.json({
      success: true,
      data   : {
        ...plan,
        joursRestants: jours,
        estEnRetard,
        urgence: jours < 0 ? 'EN_RETARD'
                : jours <= 2 ? 'URGENT'
                : jours <= 7 ? 'NORMAL'
                : 'OK',
      }
    });

  } catch (err: any) {
    console.error('Erreur GET /api/plans-correction/[id]:', err.message);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// ============================================================
// PATCH — Mise à jour du plan
// ============================================================

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id }   = await params;
    const body     = await req.json();
    const {
      statut,
      priorite,
      dateEcheance,
      commentaire,
      assigneA,
    } = body;

    // Récupérer le plan existant
    const planExistant = await prisma.planCorrection.findUnique({
      where : { id },
      select: {
        id             : true,
        createdBy      : true,
        assigneA       : true,
        statut         : true,
        idVulnerabilite: true,
      }
    });

    if (!planExistant) {
      return NextResponse.json({ error: 'Plan non trouvé' }, { status: 404 });
    }

    const userRole  = String(session.user.role ?? '').toUpperCase().trim();
    const isCreator = planExistant.createdBy === session.user.id;

    // ─── Vérification technicien si assignation ───────────────
    if (assigneA) {
      const technicien = await prisma.utilisateur.findFirst({
        where: {
          id       : assigneA,
          role     : 'TECHNICIEN',
          actif    : true,
          deletedAt: null,
        }
      });

      if (!technicien) {
        return NextResponse.json(
          { error: 'Technicien introuvable ou inactif' },
          { status: 404 }
        );
      }
    }

    // ──────────────────────────────────────────────────────────
    // PERMISSIONS
    // ──────────────────────────────────────────────────────────

    let hasPermission = false;
    let erreurPermission = '';

    switch (userRole) {

      case 'ADMIN':
        // Admin peut tout faire
        hasPermission = true;
        break;

      case 'AUDITEUR':
        hasPermission = isCreator;

        // L'auditeur peut assigner un technicien
        // mais ne peut pas changer le statut d'exécution
        if (statut && ['EN_COURS', 'TERMINE', 'VERIFIE'].includes(statut)) {
          return NextResponse.json({
            error: "L'Auditeur ne peut pas démarrer, terminer ou vérifier un plan. " +
                   "Ces actions sont réservées au Technicien et au Superviseur."
          }, { status: 403 });
        }
        break;

      case 'TECHNICIEN':
        // Le technicien peut uniquement avancer son plan
        const isAssigned = planExistant.assigneA === session.user.id;
        const peutAvancer = ['A_FAIRE', 'EN_COURS'].includes(planExistant.statut);
        const statutValide = ['EN_COURS', 'TERMINE'].includes(statut ?? '');

        hasPermission = isAssigned && peutAvancer && statutValide;

        if (!isAssigned) {
          erreurPermission = 'Ce plan ne vous est pas assigné.';
        } else if (!peutAvancer) {
          erreurPermission = `Le plan est déjà en statut "${planExistant.statut}".`;
        } else if (!statutValide) {
          erreurPermission = 'Action non autorisée pour votre rôle.';
        }
        break;

      case 'SUPERVISEUR':
        // Le superviseur valide uniquement les plans terminés
        hasPermission =
          planExistant.statut === 'TERMINE' && statut === 'VERIFIE';

        if (!hasPermission) {
          erreurPermission = 'Le Superviseur ne peut vérifier que les plans en statut TERMINE.';
        }
        break;

      default:
        erreurPermission = 'Rôle non reconnu.';
    }

    if (!hasPermission) {
      return NextResponse.json({
        error: erreurPermission || "Permissions insuffisantes pour cette action."
      }, { status: 403 });
    }

    // ──────────────────────────────────────────────────────────
    // MISE À JOUR EN TRANSACTION
    // ──────────────────────────────────────────────────────────

    const plan = await prisma.$transaction(async (tx) => {

      // 1. Mise à jour du plan
      const updated = await tx.planCorrection.update({
        where: { id },
        data : {
          ...(statut       && { statut: statut as StatutPlan }),
          ...(priorite     && { priorite }),
          ...(dateEcheance && { dateEcheance: new Date(dateEcheance) }),
          ...(commentaire !== undefined && { commentaire }),
          // ⭐ Assignation technicien
          ...(assigneA !== undefined && { assigneA: assigneA || null }),
        },
        include: PLAN_INCLUDE,
      });

      // 2. Synchronisation statut vulnérabilité
      if (statut === 'TERMINE' || statut === 'VERIFIE') {
        await tx.vulnerabilite.update({
          where: { id: planExistant.idVulnerabilite },
          data : {
            statut        : StatutVulnerabilite.CORRIGEE,
            dateCorrection: new Date(),
          }
        });
        console.log(
          `[PLAN] ✅ Vulnérabilité ${planExistant.idVulnerabilite} marquée CORRIGEE`
        );
      }

      if (statut === 'ANNULE') {
        await tx.vulnerabilite.update({
          where: { id: planExistant.idVulnerabilite },
          data : { statut: StatutVulnerabilite.OUVERTE }
        });
        console.log(
          `[PLAN] 🔄 Vulnérabilité ${planExistant.idVulnerabilite} remise OUVERTE`
        );
      }

      // ⭐ 3. Synchronisation assigneA sur la vulnérabilité
      if (assigneA !== undefined) {
        await tx.vulnerabilite.update({
          where: { id: planExistant.idVulnerabilite },
          data : { assigneA: assigneA || null }
        });
        console.log(
          `[PLAN] 👤 Technicien ${assigneA ?? 'retiré'} synchronisé sur la vulnérabilité`
        );
      }

      // 4. Log audit
      await tx.auditLog.create({
        data: {
          idUtilisateur : session.user.id,
          action        : TypeAction.MODIFICATION,
          entite        : EntiteCible.PLAN_CORRECTION,
          idEntite      : id,
          details       : {
            ancienStatut  : planExistant.statut,
            nouveauStatut : statut ?? planExistant.statut,
            assigneA      : assigneA ?? undefined,
            modifiePar    : userRole,
          }
        }
      }).catch(() => {}); // Non bloquant

      return updated;
    });

    // Rapport superviseur (hors transaction car non critique)
    if (statut === 'VERIFIE' && userRole === 'SUPERVISEUR') {
      await generateVerificationReport(plan.id, session.user.id);
    }

    // Message contextuel selon l'action
    const message =
      assigneA && !statut ? `Plan assigné à ${plan.assigne?.prenom} ${plan.assigne?.nom}` :
      statut === 'EN_COURS' ? '🔧 Plan démarré'          :
      statut === 'TERMINE'  ? '✅ Plan marqué terminé'    :
      statut === 'VERIFIE'  ? '✔️ Correction vérifiée'   :
      statut === 'ANNULE'   ? '❌ Plan annulé'            :
      'Plan mis à jour avec succès';

    return NextResponse.json({
      success: true,
      message,
      data   : plan,
    });

  } catch (error: any) {
    console.error('Erreur PATCH /api/plans-correction/[id]:', error.message);
    return NextResponse.json({
      success: false,
      error  : 'Erreur lors de la mise à jour du plan',
      details: error.message,
    }, { status: 500 });
  }
}

// ============================================================
// DELETE — Suppression d'un plan
// ============================================================

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const userRole = String(session.user.role ?? '').toUpperCase().trim();

    if (!['ADMIN', 'AUDITEUR'].includes(userRole)) {
      return NextResponse.json({
        error: "Seul l'Admin ou l'Auditeur peut supprimer un plan."
      }, { status: 403 });
    }

    const { id } = await params;

    const plan = await prisma.planCorrection.findUnique({
      where : { id },
      select: {
        idVulnerabilite: true,
        statut         : true,
        createdBy      : true,
      }
    });

    if (!plan) {
      return NextResponse.json({ error: 'Plan non trouvé' }, { status: 404 });
    }

    // L'Auditeur ne peut supprimer que SES plans
    if (userRole === 'AUDITEUR' && plan.createdBy !== session.user.id) {
      return NextResponse.json({
        error: "Vous ne pouvez supprimer que les plans que vous avez créés."
      }, { status: 403 });
    }

    // Ne pas supprimer un plan déjà vérifié
    if (plan.statut === 'VERIFIE') {
      return NextResponse.json({
        error: "Impossible de supprimer un plan déjà vérifié."
      }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Supprimer le plan
      await tx.planCorrection.delete({ where: { id } });

      // 2. Remettre la vulnérabilité en OUVERTE
      await tx.vulnerabilite.update({
        where: { id: plan.idVulnerabilite },
        data : {
          statut  : StatutVulnerabilite.OUVERTE,
          assigneA: null,   // ⭐ Retirer l'assignation aussi
        }
      });

      // 3. Log audit
      await tx.auditLog.create({
        data: {
          idUtilisateur : session.user.id,
          action        : TypeAction.SUPPRESSION,
          entite        : EntiteCible.PLAN_CORRECTION,
          idEntite      : id,
          details       : {
            idVulnerabilite: plan.idVulnerabilite,
            supprimePar    : userRole,
          }
        }
      }).catch(() => {});
    });

    return NextResponse.json({
      success: true,
      message: 'Plan supprimé — vulnérabilité remise en OUVERTE',
    });

  } catch (error: any) {
    console.error('Erreur DELETE /api/plans-correction/[id]:', error.message);
    return NextResponse.json({
      success: false,
      error  : 'Erreur lors de la suppression du plan',
    }, { status: 500 });
  }
}