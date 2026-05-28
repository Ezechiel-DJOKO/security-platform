import { NextResponse } from 'next/server';
import { saveScanResult } from '@/lib/scan-service';
import { TypeScan, OutilScan, RoleUtilisateur } from '@prisma/client';
import { prisma } from '@/lib/scan-service';   // On importe prisma depuis ton service

export async function GET() {
  try {
    // === CRÉATION D'UN ACTIF DE TEST ===
    let actif = await prisma.actif.findFirst();
    
    if (!actif) {
      actif = await prisma.actif.create({
        data: {
          nom: "Serveur de Test - Web",
          adresseIP: "192.168.1.100",
          hostname: "web-test.local",
          type: "SERVEUR",
          criticite: "ELEVE",
          localisation: "Cotonou - Data Center",
        }
      });
      console.log("✅ Actif de test créé");
    }

    // === CRÉATION D'UN UTILISATEUR DE TEST ===
    let utilisateur = await prisma.utilisateur.findFirst();
    
    if (!utilisateur) {
      utilisateur = await prisma.utilisateur.create({
        data: {
          nom: "Test",
          prenom: "Utilisateur",
          email: "test@exemple.com",
          motDePasseHashe: "$2b$10$dummyhash123456789", // Mot de passe hashé factice
          role: RoleUtilisateur.AUDITEUR,
          actif: true,
        }
      });
      console.log("✅ Utilisateur de test créé");
    }

    // === LANCEMENT DU SCAN DE TEST ===
    const scan = await saveScanResult({
      idActif: actif.id,
      lancerPar: utilisateur.id,
      type: TypeScan.VULNERABILITE,
      outil: OutilScan.NUCLEI,
      duree: 42,
      resultatBrut: { 
        tool: "Nuclei", 
        command: "nuclei -u https://example.com -json" 
      },
      vulnerabilites: [
        {
          titre: "SQL Injection détectée",
          description: "Vulnérabilité critique sur le paramètre 'id'",
          severite: "CRITICAL",
          scoreCVSS: 9.8,
          recommandation: "Utiliser des requêtes préparées"
        },
        {
          titre: "XSS Reflected",
          description: "Cross-Site Scripting possible",
          severite: "HIGH",
          scoreCVSS: 6.1,
        }
      ]
    });

    return NextResponse.json({ 
      success: true, 
      message: "Test complet réussi !",
      scanId: scan.id,
      actifId: actif.id,
      userId: utilisateur.id
    });

  } catch (error: any) {
    console.error("Erreur complète :", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}