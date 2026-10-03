import { useState, useEffect } from 'react';
import axios from 'axios';
import { getBaseUrl } from './api';

export type ServerHealthState = 'connecting' | 'online' | 'offline';

let currentServerState: ServerHealthState = 'connecting';
let pingIntervalId: any = null;
let retryCount = 0;

/**
 * Realiza un ping al endpoint de salud del backend para despertarlo o verificar disponibilidad.
 */
export async function pingBackend(): Promise<boolean> {
  const url = `${getBaseUrl()}/health`;
  try {
    const res = await axios.get(url, { timeout: 12000 });
    if (res.data?.status === 'ok' || res.status === 200) {
      if (currentServerState !== 'online') {
        currentServerState = 'online';
        window.dispatchEvent(new CustomEvent('korevx_server_status_change', { detail: 'online' }));
        window.dispatchEvent(new CustomEvent('korevx_server_online'));
      }
      return true;
    }
  } catch (err) {
    // Si falla y venía de connecting o llevaba varios intentos
    retryCount++;
    if (retryCount > 6 && currentServerState !== 'offline') {
      currentServerState = 'offline';
      window.dispatchEvent(new CustomEvent('korevx_server_status_change', { detail: 'offline' }));
    } else if (currentServerState !== 'connecting') {
      currentServerState = 'connecting';
      window.dispatchEvent(new CustomEvent('korevx_server_status_change', { detail: 'connecting' }));
    }
  }
  return false;
}

/**
 * Inicia el proceso de pre-calentamiento periódico del backend (despierta Render al abrir la web).
 */
export function startBackendPrewarm() {
  if (pingIntervalId) return;

  // 1. Ping inicial inmediato
  pingBackend();

  // 2. Reintentos frecuentes cada 3 segundos hasta que responda
  pingIntervalId = setInterval(async () => {
    const isOnline = await pingBackend();
    if (isOnline) {
      // Una vez en línea, cambiamos a verificación periódica cada 4 minutos para mantenerlo despierto
      clearInterval(pingIntervalId);
      pingIntervalId = setInterval(() => {
        pingBackend();
      }, 4 * 60 * 1000); // Cada 4 minutos evita que Render entre en reposo de 15 min
    }
  }, 3000);
}

// Iniciar pre-calentamiento automático en la carga del script
if (typeof window !== 'undefined') {
  startBackendPrewarm();
}

/**
 * Hook para consumir el estado en vivo del servidor en componentes React
 */
export function useServerStatus(): ServerHealthState {
  const [status, setStatus] = useState<ServerHealthState>(currentServerState);

  useEffect(() => {
    const handleStatus = (e: any) => {
      setStatus(e.detail);
    };
    window.addEventListener('korevx_server_status_change', handleStatus);
    return () => {
      window.removeEventListener('korevx_server_status_change', handleStatus);
    };
  }, []);

  return status;
}
