// src/app/api/notify/events/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      // Pour l'instant on simule, plus tard tu pourras broadcaster via Prisma ou Redis
      const interval = setInterval(() => {
        controller.enqueue(`data: ${JSON.stringify({
          type: 'SCAN_COMPLETED',
          message: 'Un scan vient de se terminer avec des vulnérabilités critiques.'
        })}\n\n`);
      }, 15000); // simulation toutes les 15s

      return () => clearInterval(interval);
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}