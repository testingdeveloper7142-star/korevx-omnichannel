import { io, Socket } from 'socket.io-client';

class WebSocketService {
  private socket: Socket | null = null;

  connect(workspaceId: string = 'default-workspace') {
    if (this.socket) return this.socket;

    const backendOrigin = (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1'))
      ? 'https://korevx-omnichannel.onrender.com'
      : '/';

    this.socket = io(backendOrigin, {
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('⚡ Conectado a WebSockets KorevX en tiempo real');
      this.socket?.emit('join:workspace', { workspaceId });
    });

    return this.socket;
  }

  onNewMessage(callback: (message: any) => void) {
    this.socket?.on('message:new', callback);
  }

  onConversationUpdated(callback: (conversation: any) => void) {
    this.socket?.on('conversation:updated', callback);
  }

  // Auditoría Interna en Tiempo Real
  emitAuditRequest(payload: { conversationId: string; clientName: string; requestedByName: string; assignedAgentId?: string }) {
    this.socket?.emit('audit:request', payload);
  }

  onAuditRequest(callback: (data: { conversationId: string; clientName: string; requestedByName: string; assignedAgentId?: string }) => void) {
    this.socket?.on('audit:request', callback);
  }

  emitAuditResponse(payload: { conversationId: string; accepted: boolean; agentName: string }) {
    this.socket?.emit('audit:response', payload);
  }

  onAuditResponse(callback: (data: { conversationId: string; accepted: boolean; agentName: string }) => void) {
    this.socket?.on('audit:response', callback);
  }

  // Compartir con Admin en Tiempo Real
  emitConversationShare(payload: { conversationId: string; clientName: string; agentName: string }) {
    this.socket?.emit('conversation:share', payload);
  }

  onConversationShare(callback: (data: { conversationId: string; clientName: string; agentName: string }) => void) {
    this.socket?.on('conversation:share', callback);
  }

  // Asignación de Conversaciones en Tiempo Real
  emitConversationAssign(payload: { conversationId: string; clientName: string; assignedAgentId: string; assignedAgentName: string; assignedByName: string }) {
    this.socket?.emit('conversation:assign', payload);
  }

  onConversationAssign(callback: (data: { conversationId: string; clientName: string; assignedAgentId: string; assignedAgentName: string; assignedByName: string }) => void) {
    this.socket?.on('conversation:assign', callback);
  }

  // Modo Auditoría General en Tiempo Real
  emitAuditMode(payload: { active: boolean; activatedByName: string; duration?: string }) {
    this.socket?.emit('audit:mode', payload);
  }

  onAuditMode(callback: (data: { active: boolean; activatedByName: string; duration?: string }) => void) {
    this.socket?.on('audit:mode', callback);
  }

  // Caso Resuelto en Tiempo Real
  emitConversationResolved(payload: { conversationId: string; clientName: string; agentName: string }) {
    this.socket?.emit('conversation:resolved', payload);
  }

  onConversationResolved(callback: (data: { conversationId: string; clientName: string; agentName: string }) => void) {
    this.socket?.on('conversation:resolved', callback);
  }

  // Sincronización de Canales en tiempo real
  emitChannelCreate(channel: any) {
    this.socket?.emit('channel:create', channel);
  }

  onChannelCreated(callback: (channel: any) => void) {
    this.socket?.on('channel:created', callback);
  }

  emitChannelToggle(data: { channelId: string; isActive: boolean }) {
    this.socket?.emit('channel:toggle', data);
  }

  onChannelToggled(callback: (data: { channelId: string; isActive: boolean }) => void) {
    this.socket?.on('channel:toggled', callback);
  }

  emitChannelDelete(channelId: string) {
    this.socket?.emit('channel:delete', { channelId });
  }

  onChannelDeleted(callback: (data: { channelId: string }) => void) {
    this.socket?.on('channel:deleted', callback);
  }

  requestChannelSync() {
    this.socket?.emit('channel:get_sync');
  }

  onChannelSync(callback: (channels: any[]) => void) {
    this.socket?.on('channel:sync', callback);
  }

  // Sincronización de Plantillas de Respuestas Rápidas
  emitTemplateCreate(template: any) {
    this.socket?.emit('template:create', template);
  }

  onTemplateCreated(callback: (template: any) => void) {
    this.socket?.on('template:created', callback);
  }

  emitTemplateDelete(templateId: string) {
    this.socket?.emit('template:delete', { templateId });
  }

  onTemplateDeleted(callback: (data: { templateId: string }) => void) {
    this.socket?.on('template:deleted', callback);
  }

  requestTemplateSync() {
    this.socket?.emit('template:get_sync');
  }

  onTemplateSync(callback: (templates: any[]) => void) {
    this.socket?.on('template:sync', callback);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketService = new WebSocketService();
