'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';

export default function AlertListener() {
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);

  const connect = useCallback(() => {
    // Nettoyage de l'ancienne connexion
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    const eventSource = new EventSource('/api/notify/events');
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('🟢 SSE connecté avec succès');
      setConnected(true);
      retryCountRef.current = 0; // Reset des tentatives
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('🔔 Notification SSE:', data);

        if (data.type === 'SCAN_COMPLETED' || data.type === 'CRITICAL_VULN') {
          toast.success(data.message || 'Scan terminé !', {
            duration: 6000,
            position: 'top-center',
            icon: '🚨',
          });
        } else if (data.type === 'CONNECTED') {
          console.log('✅ SSE initialisé:', data.message);
        }
      } catch (e) {
        console.error('❌ Erreur parsing JSON SSE:', e);
        console.error('Données brutes:', event.data);
      }
    };

    eventSource.onerror = (err) => {
      console.warn('⚠️ Erreur SSE détectée', err);
      setConnected(false);

      // Fermeture propre
      eventSource.close();
      eventSourceRef.current = null;

      // Backoff exponentiel (max 30s)
      const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
      retryCountRef.current += 1;

      console.log(`🔄 Reconexion dans ${delay / 1000}s (tentative ${retryCountRef.current})`);

      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, delay);
    };
  }, []);

  useEffect(() => {
    connect();

    // Nettoyage au démontage
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [connect]);

  return null; // Composant invisible
}