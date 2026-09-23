import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EventsGateway } from '../websockets/events.gateway';
import {
  CanonicalNormalizedEvent,
  PlatformType,
  InteractionType,
} from '../channels/interfaces/social-channel-adapter.interface';
import { ConversationStatus, SenderType } from '@prisma/client';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async processNormalizedEvents(events: CanonicalNormalizedEvent[]) {
    for (const event of events) {
      try {
        await this.persistNormalizedEvent(event);
      } catch (err) {
        this.logger.error(`Error persistiendo evento normalizado: ${err.message}`, err.stack);
      }
    }
  }

  private async persistNormalizedEvent(event: CanonicalNormalizedEvent) {
    // 1. Obtener o vincular canal
    let channel = await this.prisma.channelAccount.findUnique({
      where: { id: event.channelAccountId },
    });

    if (!channel) {
      // Intentar buscar por externalAccountId o usar canal default/crear
      const defaultWorkspace = await this.getOrCreateDefaultWorkspace();
      channel = await this.prisma.channelAccount.findFirst({
        where: { platform: event.platform as any },
      });

      if (!channel) {
        channel = await this.prisma.channelAccount.create({
          data: {
            workspaceId: defaultWorkspace.id,
            platform: event.platform as any,
            accountName: `KorevX ${event.platform}`,
            accountHandle: `@korevx_${event.platform.toLowerCase()}`,
            externalAccountId: `ext_${event.platform}_${Date.now()}`,
            accessToken: 'dummy_token',
            isActive: true,
          },
        });
      }
    }

    const workspaceId = channel.workspaceId;

    // 2. Gestionar Identidad Social y Contacto (CRM Unificado)
    let identity = await this.prisma.contactSocialIdentity.findUnique({
      where: {
        platform_externalId: {
          platform: event.platform as any,
          externalId: event.sender.externalId,
        },
      },
      include: { contact: true },
    });

    let contact = identity?.contact;

    if (!contact) {
      contact = await this.prisma.contact.create({
        data: {
          workspaceId,
          name: event.sender.name,
          avatarUrl: event.sender.avatarUrl,
        },
      });

      identity = await this.prisma.contactSocialIdentity.create({
        data: {
          contactId: contact.id,
          platform: event.platform as any,
          externalId: event.sender.externalId,
          handle: event.sender.username,
          displayName: event.sender.name,
          profilePicUrl: event.sender.avatarUrl,
        },
        include: { contact: true },
      });
    }

    // 3. Obtener o crear Conversación
    let conversation = await this.prisma.conversation.findUnique({
      where: {
        channelAccountId_externalThreadId: {
          channelAccountId: channel.id,
          externalThreadId: event.externalConversationId,
        },
      },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          workspaceId,
          channelAccountId: channel.id,
          contactId: contact.id,
          externalThreadId: event.externalConversationId,
          interactionType: event.interactionType as any,
          postId: event.postContext?.postId,
          postUrl: event.postContext?.postUrl,
          postTitle: event.postContext?.postTitle,
          postThumbnail: event.postContext?.postThumbnail,
          status: ConversationStatus.PENDING,
          lastActivityAt: event.timestamp,
          unreadCount: 1,
        },
      });
    } else {
      // Reabrir a PENDING si ya estaba resuelta o sigue pendiente
      conversation = await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          status: conversation.status === ConversationStatus.RESOLVED ? ConversationStatus.PENDING : conversation.status,
          unreadCount: { increment: 1 },
          lastActivityAt: event.timestamp,
        },
      });
    }

    // 4. Crear el Mensaje con idempotencia (externalMessageId)
    const existingMessage = await this.prisma.message.findUnique({
      where: { externalMessageId: event.externalMessageId },
    });

    if (existingMessage) {
      this.logger.debug(`Mensaje ya existe previamente: ${event.externalMessageId}`);
      return;
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderType: SenderType.CUSTOMER,
        externalMessageId: event.externalMessageId,
        content: event.content,
        mediaUrls: event.mediaUrls || [],
        parentCommentId: event.postContext?.parentCommentId,
        rawPayload: event.rawPayload,
        sentAt: event.timestamp,
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

    // 5. Emitir eventos a través del WebSocket Gateway
    this.eventsGateway.emitNewMessage(workspaceId, message);
    this.eventsGateway.emitConversationUpdated(workspaceId, message.conversation);

    this.logger.log(`Mensaje persistido y emitido: ID ${message.id} | Plataforma ${event.platform} | Tipo ${event.interactionType}`);
  }

  private async getOrCreateDefaultWorkspace() {
    let ws = await this.prisma.workspace.findFirst();
    if (!ws) {
      ws = await this.prisma.workspace.create({
        data: {
          name: 'KorevX HQ',
          slug: 'korevx-hq',
        },
      });
    }
    return ws;
  }
}
