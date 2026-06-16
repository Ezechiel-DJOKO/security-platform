// src/lib/alertService.ts
import { prisma } from '@/lib/prisma';

interface AlertPayload {
  scanId: string;
  type: 'SCAN_COMPLETED' | 'CRITICAL_VULN' | 'ERROR';
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  userId?: string;
}

export async function sendAlert(payload: AlertPayload) {
  console.log(`🔔 Envoi d'alerte : ${payload.message}`);

  try {
    // Enregistrer l'alerte en base (tu peux créer un model Alert plus tard)
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

    // Ici tu peux ajouter :
    // - Envoi d'email (Resend, Nodemailer...)
    // - Notification WebSocket / Push
    // - Slack / Teams webhook

    if (payload.severity === 'CRITICAL') {
      console.log(`🚨 ALERTE CRITIQUE : ${payload.message}`);
      // Ajouter logique de notification urgente ici
    }

    return { success: true };
  } catch (error) {
    console.error("Erreur lors de l'envoi d'alerte:", error);
    return { success: false };
  }
}