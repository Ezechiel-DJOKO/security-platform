// src/lib/alertService.ts
import { prisma } from '@/lib/prisma';

interface AlertPayload {
  scanId: string;
  type: 'SCAN_COMPLETED' | 'CRITICAL_VULN' | 'ERROR';
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  userId?: string;
}

/**
 * Fonction principale d'envoi d'alerte
 */
export async function sendAlert(payload: AlertPayload) {
  console.log(`🔔 Envoi d'alerte : ${payload.message}`);

  try {
    // Enregistrer dans l'audit log
    await prisma.auditLog.create({
      data: {
        idUtilisateur: payload.userId,
        action: 'SCAN',
        entite: 'SCAN',
        idEntite: payload.scanId,
        details: {
          type: payload.type,
          message: payload.message,
          severity: payload.severity
        }
      }
    });

    if (payload.severity === 'CRITICAL') {
      console.log(`🚨 ALERTE CRITIQUE : ${payload.message}`);
      // TODO: Ajouter plus tard email, Slack, WebSocket, etc.
    }

    return { success: true };
  } catch (error) {
    console.error("Erreur lors de l'envoi d'alerte:", error);
    return { success: false };
  }
}

/**
 * Fonction de commodité pour appeler facilement depuis scan.ts
 * (accepte juste le scanId)
 */
export async function sendAlerts(scanId: string): Promise<void> {
  await sendAlert({
    scanId,
    type: 'SCAN_COMPLETED',
    message: `Scan ${scanId} terminé`,
    severity: 'INFO',
    // userId: on peut le récupérer du scan si besoin
  });
}