'use client';
import { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';

export default function AlertListener() {
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      // Fermer l'ancienne connexion si elle existe
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const eventSource = new EventSource('/api/notify/events');
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('🟢 AlertListener connecté aux notifications SSE');
        setConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('🔔 Notification reçue:', data);

          if (data.type === 'SCAN_COMPLETED' || data.type === 'CRITICAL_VULN') {
            toast.success(data.message || 'Scan terminé avec succès !', {
              duration: 6000,
              position: 'top-center',
              icon: '🚨',
            });
          } else if (data.type === 'CONNECTED') {
            console.log('✅ SSE initialisé:', data.message);
          }
        } catch (e) {
          console.error('❌ Erreur parsing JSON SSE:', e);
          console.error('Données brutes reçues:', event.data);
        }
      };

      eventSource.onerror = (err) => {
        console.warn('⚠️ Erreur SSE, tentative de reconnexion...', err);
        setConnected(false);
        eventSource.close();

        // Tentative de reconnexion après 5 secondes
        reconnectTimeout = setTimeout(() => {
          connect();
        }, 5000);
      };
    };

    connect();

    // Nettoyage
    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return null; // Composant invisible
}