import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  // ✅ prisma.utilisateur (pas prisma.user)
  const utilisateur = await prisma.utilisateur.findUnique({
    where: { id: session.user.id },
    select: { role: true }
  });

  if (utilisateur?.role !== 'AUDITEUR') {
    return NextResponse.json({ error: "Acces reserve aux auditeurs" }, { status: 403 });
  }

  try {
    // ⚠️ PlanCorrection n'a pas de auditeurId
    // On récupère tous les plans (l'auditeur a une vue globale)
    const allPlans = await prisma.planCorrection.findMany({
      include: {
        vulnerabilite: { 
          select: { 
            titre: true,
            severite: true,
            cveId: true
          } 
        },
        // ✅ relation "assigne" = Utilisateur via PlanAssigneA
        assigne: {
          select: { 
            nom: true, 
            prenom: true, 
            email: true 
          } 
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    console.log(`Auditeur ${session.user.email} - ${allPlans.length} plans recuperes`);

    const rapports = allPlans.map(plan => ({
      id: plan.id,
      titre: plan.vulnerabilite?.titre || 'Sans titre',
      severite: plan.vulnerabilite?.severite || 'NON_DEFINIE',
      cveId: plan.vulnerabilite?.cveId || null,
      technicien: plan.assigne 
        ? `${plan.assigne.prenom || ''} ${plan.assigne.nom || ''}`.trim() || plan.assigne.email
        : 'Non assigne',
      genereLe: plan.updatedAt.toISOString(),
      dateEcheance: plan.dateEcheance.toISOString(),
      dateResolution: plan.dateResolution?.toISOString() || null,
      // ✅ Mapping StatutPlan vers statut frontend
      statut: plan.statut === 'TERMINE'   ? 'termine'   :
              plan.statut === 'EN_RETARD' ? 'en_retard' :
              plan.statut === 'ANNULE'    ? 'annule'    : 'en_cours',
      type: 'assignation',
    }));

    const stats = {
      total:    rapports.length,
      termines: rapports.filter(r => r.statut === 'termine').length,
      enCours:  rapports.filter(r => r.statut === 'en_cours').length,
      enRetard: rapports.filter(r => r.statut === 'en_retard').length,
      annules:  rapports.filter(r => r.statut === 'annule').length,
    };

    return NextResponse.json({
      success: true,
      data: rapports,
      stats
    });

  } catch (error: any) {
    console.error("Erreur chargement assignations auditeur:", error);
    return NextResponse.json({
      success: false,
      error: "Erreur serveur",
      message: error.message
    }, { status: 500 });
  }
}