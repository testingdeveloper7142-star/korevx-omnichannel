import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  private sharedChannels: any[] = [];
  private sharedTemplates: any[] = [];

  handleConnection(client: Socket) {
    this.logger.log(`Cliente conectado a WebSockets: ${client.id}`);
    // Enviar estado sincronizado de canales y plantillas inmediatamente al conectar
    client.emit('channel:sync', this.sharedChannels);
    client.emit('template:sync', this.sharedTemplates);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Cliente desconectado de WebSockets: ${client.id}`);
  }

  @SubscribeMessage('join:workspace')
  handleJoinWorkspace(@ConnectedSocket() client: Socket, @MessageBody() data: { workspaceId: string }) {
    if (data?.workspaceId) {
      client.join(`workspace:${data.workspaceId}`);
      this.logger.log(`Cliente ${client.id} se unió a la sala workspace:${data.workspaceId}`);
    }
  }

  @SubscribeMessage('join:conversation')
  handleJoinConversation(@ConnectedSocket() client: Socket, @MessageBody() data: { conversationId: string }) {
    if (data?.conversationId) {
      client.join(`conversation:${data.conversationId}`);
      this.logger.log(`Cliente ${client.id} se unió a la conversación conversation:${data.conversationId}`);
    }
  }

  @SubscribeMessage('audit:request')
  handleAuditRequest(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    this.logger.log(`Solicitud de auditoría recibida en WebSocket para conversación ${data?.conversationId}`);
    this.server.emit('audit:request', data);
  }

  @SubscribeMessage('audit:response')
  handleAuditResponse(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    this.logger.log(`Respuesta de auditoría recibida en WebSocket: ${data?.accepted ? 'Aprobada' : 'Rechazada'}`);
    this.server.emit('audit:response', data);
  }

  @SubscribeMessage('conversation:share')
  handleConversationShare(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    this.logger.log(`Conversación ${data?.conversationId} compartida con supervisión`);
    this.server.emit('conversation:share', data);
  }

  @SubscribeMessage('conversation:assign')
  handleConversationAssign(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    this.logger.log(`Conversación ${data?.conversationId} asignada al agente ${data?.assignedAgentName}`);
    this.server.emit('conversation:assign', data);
  }

  @SubscribeMessage('audit:mode')
  handleAuditMode(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    this.logger.log(`Modo Auditoría cambiado: ${data?.active ? 'Activado' : 'Desactivado'} por ${data?.activatedByName}`);
    this.server.emit('audit:mode', data);
  }

  @SubscribeMessage('conversation:resolved')
  handleConversationResolved(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    this.logger.log(`Conversación ${data?.conversationId} marcada como resuelta por ${data?.agentName}`);
    this.server.emit('conversation:resolved', data);
  }

  @SubscribeMessage('channel:get_sync')
  handleChannelGetSync(@ConnectedSocket() client: Socket) {
    client.emit('channel:sync', this.sharedChannels);
  }

  @SubscribeMessage('channel:create')
  handleChannelCreate(@ConnectedSocket() client: Socket, @MessageBody() newChannel: any) {
    if (newChannel && newChannel.id) {
      const idx = this.sharedChannels.findIndex((c) => c.id === newChannel.id);
      if (idx === -1) {
        this.sharedChannels.push(newChannel);
      } else {
        this.sharedChannels[idx] = newChannel;
      }
      this.logger.log(`Canal creado/vinculado: ${newChannel.accountName} (${newChannel.platform})`);
      this.server.emit('channel:created', newChannel);
      this.server.emit('channel:sync', this.sharedChannels);
    }
  }

  @SubscribeMessage('channel:toggle')
  handleChannelToggle(@ConnectedSocket() client: Socket, @MessageBody() data: { channelId: string; isActive: boolean }) {
    const chan = this.sharedChannels.find((c) => c.id === data.channelId);
    if (chan) {
      chan.isActive = data.isActive;
      this.logger.log(`Canal ${chan.accountName} cambiado de estado a ${data.isActive ? 'Activo' : 'Pausado'}`);
      this.server.emit('channel:toggled', data);
      this.server.emit('channel:sync', this.sharedChannels);
    }
  }

  @SubscribeMessage('channel:delete')
  handleChannelDelete(@ConnectedSocket() client: Socket, @MessageBody() data: { channelId: string }) {
    this.sharedChannels = this.sharedChannels.filter((c) => c.id !== data.channelId);
    this.logger.log(`Canal eliminado: ${data.channelId}`);
    this.server.emit('channel:deleted', data);
    this.server.emit('channel:sync', this.sharedChannels);
  }

  @SubscribeMessage('template:get_sync')
  handleTemplateGetSync(@ConnectedSocket() client: Socket) {
    client.emit('template:sync', this.sharedTemplates);
  }

  @SubscribeMessage('template:create')
  handleTemplateCreate(@ConnectedSocket() client: Socket, @MessageBody() template: any) {
    if (template && template.id) {
      const idx = this.sharedTemplates.findIndex((t) => t.id === template.id || t.shortcut === template.shortcut);
      if (idx === -1) {
        this.sharedTemplates.push(template);
      } else {
        this.sharedTemplates[idx] = template;
      }
      this.logger.log(`Plantilla creada: ${template.shortcut} - ${template.title}`);
      this.server.emit('template:created', template);
      this.server.emit('template:sync', this.sharedTemplates);
    }
  }

  @SubscribeMessage('template:delete')
  handleTemplateDelete(@ConnectedSocket() client: Socket, @MessageBody() data: { templateId: string }) {
    this.sharedTemplates = this.sharedTemplates.filter((t) => t.id !== data.templateId);
    this.logger.log(`Plantilla eliminada: ${data.templateId}`);
    this.server.emit('template:deleted', data);
    this.server.emit('template:sync', this.sharedTemplates);
  }

  /**
   * Notifica a todos los clientes del workspace que ha llegado un nuevo mensaje o comentario
   */
  emitNewMessage(workspaceId: string, payload: any) {
    if (this.server) {
      this.server.emit('message:new', payload);
      if (workspaceId) {
        this.server.to(`workspace:${workspaceId}`).emit('message:new', payload);
      }
      if (payload?.conversationId) {
        this.server.to(`conversation:${payload.conversationId}`).emit('message:new', payload);
      }
    }
  }

  /**
   * Notifica cambio de estado o asignación en una conversación (PENDING, ASSIGNED, RESOLVED)
   */
  emitConversationUpdated(workspaceId: string, payload: any) {
    if (this.server) {
      this.server.emit('conversation:updated', payload);
      if (workspaceId) {
        this.server.to(`workspace:${workspaceId}`).emit('conversation:updated', payload);
      }
      if (payload?.id) {
        this.server.to(`conversation:${payload.id}`).emit('conversation:updated', payload);
      }
    }
  }
}
