'use client';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export default function AlertListener() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Option 1 : Server-Sent Events (recommandé pour simplicité)
    const eventSource = new EventSource('/api/notify/events');

    eventSource.onopen = () => {
      console.log('🟢 AlertListener connecté');
      setConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'SCAN_COMPLETED' || data.type === 'CRITICAL_VULN') {
          toast.success(data.message || 'Scan terminé avec succès !', {
            duration: 6000,
            position: 'top-center',
            icon: '🚨',
          });
        }
      } catch (e) {
        console.error('Erreur parsing notification:', e);
      }
    };

    eventSource.onerror = () => {
      console.warn('⚠️ Erreur SSE, reconnexion...');
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return null; // Ce composant n'affiche rien, il écoute seulement
}