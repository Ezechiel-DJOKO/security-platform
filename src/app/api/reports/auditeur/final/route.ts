import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    console.log("🔍 ID Auditeur :", session.user.id);

    // Récupération de tous les plans (createdBy est null pour le moment)
    const plans = await prisma.planCorrection.findMany({
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

    console.log(`✅ Plans récupérés pour le rapport : ${plans.length}`);

    const completed = plans.filter(p => p.statut === 'TERMINE');
    const total = plans.length;
    const tauxRealisation = total > 0 ? Math.round((completed.length / total) * 100) : 0;

    // === Génération PDF ===
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const { height } = page.getSize();
    
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    let y = height - 80;

    // En-tête
    page.drawText("RAPPORT FINAL D'AUDITEUR", {
      x: 50, y, size: 26, font: boldFont, color: rgb(0.1, 0.1, 0.6),
    });

    y -= 40;
    const auditeurName = session.user.name || session.user.email || 'Auditeur';
    page.drawText(`Auditeur : ${auditeurName}`, { x: 50, y, size: 14, font });

    y -= 25;
    page.drawText(`Généré le : ${new Date().toLocaleDateString('fr-FR')}`, { 
      x: 50, y, size: 12, font 
    });

    // Statistiques
    y -= 50;
    page.drawText("SYNTHÈSE DE VOTRE ACTIVITÉ", { 
      x: 50, y, size: 18, font: boldFont 
    });

    y -= 35;
    page.drawText(`Total assignations : ${total}`, { 
      x: 70, y, size: 13, font 
    });
    y -= 25;
    page.drawText(`Assignations terminées : ${completed.length}`, { 
      x: 70, y, size: 13, font 
    });
    y -= 25;
    page.drawText(`Taux de réalisation : ${tauxRealisation}%`, { 
      x: 70, y, size: 13, font 
    });

    // Liste des assignations terminées
    y -= 50;
    page.drawText("ASSIGNATIONS TERMINÉES", { 
      x: 50, y, size: 16, font: boldFont 
    });
    y -= 30;

    if (completed.length === 0) {
      page.drawText("Aucune assignation terminée trouvée.", { 
        x: 70, y, size: 12, font 
      });
    } else {
      for (const plan of completed.slice(0, 15)) {  // limite à 15 pour éviter débordement
        if (y < 100) break;

        const titre = plan.vulnerabilite?.titre?.length > 80 
          ? plan.vulnerabilite.titre.substring(0, 77) + '...' 
          : plan.vulnerabilite?.titre || 'Sans titre';

        const technicien = plan.assigne 
          ? `${plan.assigne.prenom || ''} ${plan.assigne.nom || ''}`.trim() || plan.assigne.email 
          : 'Non assigné';

        page.drawText(`• ${titre}`, { x: 70, y, size: 11, font });
        y -= 20;
        page.drawText(`  Technicien : ${technicien}`, { 
          x: 80, y, size: 10, font, color: rgb(0.4, 0.4, 0.4) 
        });
        y -= 22;
      }
    }

    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Rapport_Final_Auditeur_${new Date().toISOString().slice(0,10)}.pdf"`,
      },
    });

  } catch (error: any) {
    console.error("Erreur génération rapport final auditeur:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}