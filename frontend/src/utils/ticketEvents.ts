// Canal BroadcastChannel y bus de eventos para sincronización en tiempo real de tickets entre sesiones
const TICKET_CHANNEL_NAME = 'korevx_tickets_broadcast';

export interface TicketBroadcastEvent {
  type: 'TICKET_CREATED' | 'TICKET_UPDATED';
  ticket: {
    id?: string;
    ticketNumber?: number;
    title: string;
    status?: string;
    createdById?: string;
    creatorName?: string;
    updatedByName?: string;
    resolutionNotes?: string;
    workspaceId?: string;
  };
}

class TicketEventBus {
  private channel: BroadcastChannel | null = null;
  private listeners: Array<(event: TicketBroadcastEvent) => void> = [];

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel(TICKET_CHANNEL_NAME);
        this.channel.onmessage = (msg) => {
          if (msg.data) {
            this.notifyListeners(msg.data);
          }
        };
      } catch (e) {
        console.warn('BroadcastChannel no soportado:', e);
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === 'korevx_ticket_last_event' && e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            this.notifyListeners(parsed);
          } catch {}
        }
      });
    }
  }

  emit(event: TicketBroadcastEvent) {
    this.notifyListeners(event);

    if (this.channel) {
      try {
        this.channel.postMessage(event);
      } catch {}
    }

    try {
      localStorage.setItem('korevx_ticket_last_event', JSON.stringify({ ...event, _ts: Date.now() }));
    } catch {}
  }

  subscribe(callback: (event: TicketBroadcastEvent) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notifyListeners(event: TicketBroadcastEvent) {
    this.listeners.forEach((cb) => {
      try {
        cb(event);
      } catch (err) {
        console.warn('Error en listener de ticket:', err);
      }
    });
  }
}

export const ticketEventBus = new TicketEventBus();
