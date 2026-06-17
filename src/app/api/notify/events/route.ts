// src/app/api/notify/events/route.ts
import { NextResponse } from 'next/server';
import { registerSSEClient } from '@/lib/sse';

export async function GET(request: Request) {
  let controller: ReadableStreamDefaultController | null = null;
  let heartbeatInterval: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(cont) {
      controller = cont;

      // Enregistrer le client
      const cleanup = registerSSEClient(controller);

      // === Message de bienvenue ===
      controller.enqueue(`data: ${JSON.stringify({
        type: 'CONNECTED',
        message: '✅ Connexion aux alertes temps réel établie',
        timestamp: new Date().toISOString()
      })}\n\n`);

      // === HEARTBEAT (très important) ===
      heartbeatInterval = setInterval(() => {
        if (controller) {
          try {
            // Commentaire vide = heartbeat (recommandé)
            controller.enqueue(`: heartbeat\n\n`);
          } catch (e) {
            console.error('Erreur heartbeat SSE:', e);
          }
        }
      }, 15000); // Toutes les 15 secondes

      // Nettoyage sur fermeture/abort
      request.signal.addEventListener('abort', () => {
        console.log('🛑 SSE client déconnecté (abort)');
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        cleanup();
        if (controller) {
          controller.close();
          controller = null;
        }
      });
    },

    cancel() {
      console.log('🛑 SSE stream annulé');
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      if (controller) {
        controller.close();
        controller = null;
      }
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Accel-Buffering': 'no',        // Important si tu utilises Nginx plus tard
    },
  });
}