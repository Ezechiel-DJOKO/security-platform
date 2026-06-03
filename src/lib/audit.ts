// src/lib/audit.ts
// Version finale et compatible

export async function logAuditEvent(
  userId: string,
  action: string,
  resource: string,
  details?: Record<string, unknown>
) {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const response = await fetch(`${appUrl}/api/audit/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        action,
        resource,
        details: details || {}
      }),
    });

    if (!response.ok) {
      console.warn(`[AUDIT] Échec du log: ${action}`);
    }
  } catch (error) {
    console.log(`[AUDIT FALLBACK] ${action} | User: ${userId} | ${resource}`, details);
  }
}

// === ALIAS pour compatibilité avec ton code existant ===
export { logAuditEvent as logAction };
export { logAuditEvent as logAuth };