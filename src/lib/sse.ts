// src/lib/sse.ts   ← PAS de 'use server' ici !

// Define proper types
interface ScanCompletedData {
  scanId: string;
  cible: string;
  nbVulnerabilites: number;
  nbCritiques: number;
  message: string;
  [key: string]: unknown; // For any additional properties
}

interface SSEMessage {
  type: string;
  timestamp: string;
  [key: string]: unknown;
}

let clients: ReadableStreamDefaultController[] = [];

export function registerSSEClient(controller: ReadableStreamDefaultController) {
  clients.push(controller);
  console.log(`🔌 Nouveau client SSE connecté. Total: ${clients.length}`);

  return () => {
    clients = clients.filter(c => c !== controller);
    console.log(`🔌 Client SSE déconnecté. Total restant: ${clients.length}`);
  };
}

export function broadcastScanCompleted(data: ScanCompletedData) {
  const messageData: SSEMessage = {
    type: 'SCAN_COMPLETED',
    ...data,
    timestamp: new Date().toISOString()
  };
  
  const message = `data: ${JSON.stringify(messageData)}\n\n`;

  // Copie pour éviter les modifications pendant la boucle
  const currentClients = [...clients];
  
  currentClients.forEach((controller) => {
    try {
      controller.enqueue(message);
    } catch (_e) {
      // Prefix with underscore to indicate intentionally unused
      const index = clients.indexOf(controller);
      if (index !== -1) {
        clients.splice(index, 1);
      }
    }
  });
}