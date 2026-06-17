// src/lib/sse.ts   ← PAS de 'use server' ici !

let clients: ReadableStreamDefaultController[] = [];

export function registerSSEClient(controller: ReadableStreamDefaultController) {
  clients.push(controller);
  console.log(`🔌 Nouveau client SSE connecté. Total: ${clients.length}`);

  return () => {
    clients = clients.filter(c => c !== controller);
    console.log(`🔌 Client SSE déconnecté. Total restant: ${clients.length}`);
  };
}

export function broadcastScanCompleted(data: any) {
  const message = `data: ${JSON.stringify({
    type: 'SCAN_COMPLETED',
    ...data,
    timestamp: new Date().toISOString()
  })}\n\n`;

  // Copie pour éviter les modifications pendant la boucle
  const currentClients = [...clients];
  
  currentClients.forEach((controller, index) => {
    try {
      controller.enqueue(message);
    } catch (e) {
      clients.splice(clients.indexOf(controller), 1);
    }
  });
}