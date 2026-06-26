import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    // On récupère TOUS les plans (car createdBy est null actuellement)
    const allAssignations = await prisma.planCorrection.findMany({
      include: {
        vulnerabilite: { 
          select: { titre: true } 
        },
        assigne: { 
          select: { 
            nom: true, 
            prenom: true, 
            email: true 
          } 
        }
      },
      orderBy: { 
        updatedAt: 'desc' 
      }
    });

    console.log(`✅ Total assignations récupérées : ${allAssignations.length}`);

    // Statistiques des statuts
    const statsStatut = await prisma.planCorrection.groupBy({
      by: ['statut'],
      _count: { id: true }
    });
    console.log("Répartition des statuts :", statsStatut);

    // Filtrage des assignations terminées
    const assignationsTerminees = allAssignations.filter(p => p.statut === 'TERMINE');

    const rapports = assignationsTerminees.map(plan => ({
      id: plan.id,
      titre: plan.vulnerabilite?.titre || 'Sans titre',
      technicien: plan.assigne 
        ? `${plan.assigne.prenom || ''} ${plan.assigne.nom || ''}`.trim() || plan.assigne.email
        : 'Non assigné',
      genereLe: plan.updatedAt.toISOString(),
      type: 'assignation',
    }));

    return NextResponse.json(rapports);

  } catch (error: any) {
    console.error("Erreur chargement assignations auditeur:", error);
    return NextResponse.json({
      error: "Erreur serveur",
      message: error.message
    }, { status: 500 });
  }
}