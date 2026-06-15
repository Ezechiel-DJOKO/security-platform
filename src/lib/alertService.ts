import { prisma } from '@/lib/prisma';
import { Severite } from '@prisma/client';

// Fonction d'envoi d'email (simulation pour le moment)
async function sendEmail(to: string, subject: string, html: string) {
  console.log(`📧 [EMAIL] À: ${to} | Sujet: ${subject}`);
  console.log(`Contenu: ${html.substring(0, 200)}...`);
  // TODO: Plus tard → intégrer Resend, Nodemailer, etc.
}

export async function sendAlerts(scanId: string) {
  try {
    const vulnerabilites = await prisma.vulnerabilite.findMany({
      where: {
        idScan: scanId,
        statut: 'OUVERTE'
      },
      include: {
        scan: {
          include: {
            utilisateur: true,   // Auditeur qui a lancé le scan
            actif: true
          }
        }
      }
    });

    if (vulnerabilites.length === 0) {
      console.log(`Aucune vulnérabilité à alerter pour le scan ${scanId}`);
      return { sent: 0 };
    }

    let criticalCount = 0;
    let highCount = 0;
    let utilisateur = null;

    for (const vuln of vulnerabilites) {
      utilisateur = vuln.scan?.utilisateur;
      const actif = vuln.scan?.actif;

      if (!utilisateur?.email) continue;

      const isCritical = vuln.severite === Severite.CRITICAL;

      if (isCritical) {
        criticalCount++;
        await sendEmail(
          utilisateur.email,
          `🚨 ALERTE CRITIQUE - Vulnérabilité détectée`,
          `
            <h2>🚨 Alerte Critique</h2>
            <p><strong>Scan ID :</strong> ${scanId}</p>
            <p><strong>Actif :</strong> ${actif?.nom || 'N/A'} (${actif?.adresseIP})</p>
            <p><strong>Vulnérabilité :</strong> ${vuln.titre}</p>
            <p><strong>Sévérité :</strong> ${vuln.severite} | Score CVSS : ${vuln.scoreCVSS}</p>
            <p><strong>Action requise immédiatement.</strong></p>
          `
        );
      } 
      else if (vuln.severite === Severite.HIGH) {
        highCount++;
        await sendEmail(
          utilisateur.email,
          `⚠️ Alerte Haute - Nouvelle vulnérabilité`,
          `Vulnérabilité <strong>${vuln.titre}</strong> détectée sur ${actif?.nom || 'cet actif'}.`
        );
      }
    }

    // Alerte de synthèse globale
    if (utilisateur?.email) {
      await sendEmail(
        utilisateur.email,
        `📊 Rapport de scan terminé - ${scanId}`,
        `
          <h3>Rapport disponible</h3>
          <p>Le scan <strong>${scanId}</strong> est terminé.</p>
          <ul>
            <li>Vulnérabilités détectées : ${vulnerabilites.length}</li>
            <li>Critiques : ${criticalCount}</li>
            <li>Hautes : ${highCount}</li>
          </ul>
          <p><a href="/dashboard/scans/${scanId}">Voir le rapport complet</a></p>
        `
      );
    }

    console.log(`✅ Alertes envoyées pour le scan ${scanId} | Critiques: ${criticalCount}`);

    return {
      success: true,
      totalAlerts: vulnerabilites.length,
      criticalAlerts: criticalCount
    };

  } catch (error: any) {
    console.error("Erreur lors de l'envoi des alertes:", error);
    throw new Error(`Échec d'envoi des alertes : ${error.message}`);
  }
}