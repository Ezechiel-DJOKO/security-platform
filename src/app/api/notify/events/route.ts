// src/app/api/notify/events/route.ts
import { NextResponse } from 'next/server';
import { registerSSEClient } from '@/lib/sse';

export async function GET(request: Request) {
  let controller: ReadableStreamDefaultController | null = null;

  const stream = new ReadableStream({
    start(cont) {
      controller = cont;
      const cleanup = registerSSEClient(controller);

      // Message de connexion immédiat
      controller.enqueue(`data: ${JSON.stringify({
        type: 'CONNECTED',
        message: '✅ Connexion aux alertes temps réel établie',
        timestamp: new Date().toISOString()
      })}\n\n`);

      // Nettoyage propre
      request.signal.addEventListener('abort', () => {
        cleanup();
        if (controller) {
          controller.close();
          controller = null;
        }
      });
    },

    cancel() {
      if (controller) {
        controller.close();
      }
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
}