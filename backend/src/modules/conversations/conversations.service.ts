import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ChannelsService } from '../channels/channels.service';
import { EventsGateway } from '../websockets/events.gateway';
import { AuditService } from '../audit/audit.service';
import {
  ConversationStatus,
  SenderType,
  PlatformType,
  InteractionType,
  AuditAction,
  AuditResource,
} from '@prisma/client';

export interface GetConversationsFilter {
  workspaceId?: string;
  status?: ConversationStatus;
  platform?: PlatformType;
  interactionType?: InteractionType;
  assignedUserId?: string;
  search?: string;
}

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly channelsService: ChannelsService,
    private readonly eventsGateway: EventsGateway,
    private readonly auditService: AuditService,
  ) {}

  async getConversations(filters: GetConversationsFilter) {
    const whereClause: any = {
      deletedAt: null, // Política de Soft Delete: no mostrar eliminados
    };

    if (filters.workspaceId) {
      whereClause.workspaceId = filters.workspaceId;
    }

    if (filters.status) {
      whereClause.status = filters.status;
    }

    if (filters.interactionType) {
      whereClause.interactionType = filters.interactionType;
    }

    if (filters.platform) {
      whereClause.channelAccount = {
        platform: filters.platform,
      };
    }

    if (filters.assignedUserId) {
      whereClause.assignedUserId = filters.assignedUserId;
    }

    if (filters.search) {
      whereClause.OR = [
        { contact: { name: { contains: filters.search, mode: 'insensitive' } } },
        { messages: { some: { content: { contains: filters.search, mode: 'insensitive' } } } },
      ];
    }

    return this.prisma.conversation.findMany({
      where: whereClause,
      include: {
        contact: {
          include: {
            socialIdentities: true,
          },
        },
        channelAccount: true,
        assignedUser: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        messages: {
          where: { deletedAt: null },
          orderBy: { sentAt: 'asc' },
          take: 100,
        },
      },
      orderBy: { lastActivityAt: 'desc' },
    });
  }

  async getConversationById(id: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, deletedAt: null },
      include: {
        contact: {
          include: {
            socialIdentities: true,
            notes: {
              where: { deletedAt: null },
              include: { author: true },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        channelAccount: true,
        assignedUser: true,
        messages: {
          where: { deletedAt: null },
          orderBy: { sentAt: 'asc' },
        },
        lifecycleLogs: {
          include: { performedBy: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversación ${id} no encontrada`);
    }

    // Marcar como leída
    if (conversation.unreadCount > 0) {
      await this.prisma.conversation.update({
        where: { id },
        data: { unreadCount: 0 },
      });
    }

    return conversation;
  }

  async updateConversationStatus(
    id: string,
    status: ConversationStatus,
    assignedUserId?: string,
    performedById?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const conversation = await this.prisma.conversation.findUnique({ where: { id } });
    if (!conversation) {
      throw new NotFoundException(`Conversación ${id} no encontrada`);
    }

    const previousStatus = conversation.status;
    const previousAssigned = conversation.assignedUserId;

    const updated = await this.prisma.conversation.update({
      where: { id },
      data: {
        status,
        ...(assignedUserId !== undefined ? { assignedUserId } : {}),
        ...(status === ConversationStatus.RESOLVED ? { resolvedAt: new Date() } : {}),
      },
      include: {
        contact: true,
        channelAccount: true,
        assignedUser: true,
      },
    });

    // Registrar en el ciclo de vida de la conversación
    await this.auditService.recordLifecycleTransition({
      conversationId: id,
      previousStatus,
      newStatus: status,
      performedById,
      assignedToId: assignedUserId || conversation.assignedUserId,
      reason:
        status === ConversationStatus.RESOLVED
          ? 'Conversación cerrada / Caso resuelto por agente'
          : `Estado cambiado de ${previousStatus} a ${status}`,
      ipAddress,
      userAgent,
    });

    // Registrar en la bitácora inmutable de auditoría
    await this.auditService.recordAudit({
      workspaceId: conversation.workspaceId,
      userId: performedById,
      action: AuditAction.STATUS_CHANGE,
      resource: AuditResource.CONVERSATION,
      resourceId: id,
      description: `Cambio de estado: ${previousStatus} -> ${status}`,
      previousState: { status: previousStatus, assignedUserId: previousAssigned },
      newState: { status, assignedUserId: updated.assignedUserId },
      ipAddress,
      userAgent,
    });

    this.eventsGateway.emitConversationUpdated(updated.workspaceId, updated);
    return updated;
  }

  async replyToConversation(
    conversationId: string,
    agentUserId: string,
    content: string,
    mediaUrls?: string[],
    parentCommentId?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        channelAccount: true,
        contact: {
          include: { socialIdentities: true },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversación ${conversationId} no encontrada`);
    }

    // 1. Obtener la identidad externa del contacto para el destinatario
    const identity = conversation.contact.socialIdentities.find(
      (si) => si.platform === conversation.channelAccount.platform,
    );
    const recipientExternalId = identity?.externalId || conversation.contact.name;

    // 2. Despachar a la API externa de la red social
    let externalMsgId = `agent_${Date.now()}`;
    try {
      const dispatchResult = await this.channelsService.sendOutgoingMessage(conversation.channelAccountId, {
        recipientExternalId,
        interactionType: conversation.interactionType,
        content,
        mediaUrls,
        parentCommentId: parentCommentId || conversation.postId,
        postId: conversation.postId,
      });

      if (dispatchResult.success) {
        externalMsgId = dispatchResult.externalMessageId;
      }
    } catch (err) {
      this.logger.warn(`Despacho externo falló o canal en modo simulado: ${err.message}. Guardando mensaje localmente.`);
    }

    // Validar agentUserId para evitar Foreign key constraint violated
    let validUserId: string | null = null;
    if (agentUserId && agentUserId !== 'system-agent') {
      const userExists = await this.prisma.user.findUnique({
        where: { id: agentUserId },
        select: { id: true },
      });
      if (userExists) {
        validUserId = userExists.id;
      }
    }
    if (!validUserId) {
      const defaultUser = await this.prisma.user.findFirst({
        where: { workspaceId: conversation.workspaceId },
        select: { id: true },
      });
      validUserId = defaultUser?.id || null;
    }

    // 3. Persistir el mensaje enviado en PostgreSQL
    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderType: SenderType.AGENT,
        senderUserId: validUserId,
        externalMessageId: externalMsgId,
        content,
        mediaUrls: mediaUrls || [],
        parentCommentId,
        sentAt: new Date(),
      },
      include: {
        conversation: {
          include: {
            contact: true,
            channelAccount: true,
            assignedUser: true,
          },
        },
      },
    });

    // 4. Actualizar estado de la conversación (si estaba PENDING, pasa a ASSIGNED)
    const previousStatus = conversation.status;
    const newStatus =
      conversation.status === ConversationStatus.PENDING ? ConversationStatus.ASSIGNED : conversation.status;

    const updatedConversation = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status: newStatus,
        assignedUserId: conversation.assignedUserId || validUserId,
        lastActivityAt: new Date(),
        firstResponseAt: conversation.firstResponseAt || new Date(),
      },
      include: {
        contact: true,
        channelAccount: true,
        assignedUser: true,
      },
    });

    // 5. Registrar transición en el ciclo de vida de la conversación
    if (previousStatus !== newStatus) {
      await this.auditService.recordLifecycleTransition({
        conversationId,
        previousStatus,
        newStatus,
        performedById: validUserId,
        assignedToId: conversation.assignedUserId || validUserId,
        reason: 'Primera respuesta enviada por el agente (transición automática a ASSIGNED)',
        ipAddress,
        userAgent,
      });
    }

    // 6. Registrar en AuditLog (solo si validUserId existe)
    if (validUserId) {
      await this.auditService.recordAudit({
        workspaceId: conversation.workspaceId,
        userId: validUserId,
        action: AuditAction.CREATE,
        resource: AuditResource.MESSAGE,
        resourceId: message.id,
        description: `Agente respondió a ${conversation.contact.name}`,
        newState: { contentSnippet: content.substring(0, 100) },
        ipAddress,
        userAgent,
      });
    }

    // 7. Emitir por WebSockets
    this.eventsGateway.emitNewMessage(conversation.workspaceId, message);
    this.eventsGateway.emitConversationUpdated(conversation.workspaceId, updatedConversation);

    return message;
  }

  async updateConversationContact(id: string, name: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
      include: { contact: true },
    });
    if (!conversation) {
      throw new NotFoundException(`Conversación ${id} no encontrada`);
    }

    const trimmedName = name.trim();
    await this.prisma.contact.update({
      where: { id: conversation.contactId },
      data: { name: trimmedName },
    });

    await this.prisma.contactSocialIdentity.updateMany({
      where: { contactId: conversation.contactId },
      data: { displayName: trimmedName },
    });

    const updatedConv = await this.prisma.conversation.findUnique({
      where: { id },
      include: {
        contact: {
          include: {
            socialIdentities: true,
            notes: {
              where: { deletedAt: null },
              include: { author: true },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        channelAccount: true,
        assignedUser: true,
        messages: {
          where: { deletedAt: null },
          orderBy: { sentAt: 'asc' },
        },
        lifecycleLogs: {
          include: { performedBy: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (updatedConv) {
      this.eventsGateway.emitConversationUpdated(updatedConv.workspaceId, updatedConv);
    }

    return updatedConv;
  }
}
