import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../../database/prisma.service';
import { EventsGateway } from '../websockets/events.gateway';
import {
  CanonicalNormalizedEvent,
  PlatformType,
  InteractionType,
} from '../channels/interfaces/social-channel-adapter.interface';
import { ConversationStatus, SenderType, UserRole } from '@prisma/client';

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
    // 1. Obtener o vincular canal usando recipientExternalId si está disponible
    let channel: any = null;

    if (event.recipientExternalId) {
      channel = await this.prisma.channelAccount.findFirst({
        where: {
          platform: event.platform as any,
          externalAccountId: event.recipientExternalId,
        },
      });
    }

    if (!channel && event.channelAccountId && !event.channelAccountId.includes('-default')) {
      channel = await this.prisma.channelAccount.findUnique({
        where: { id: event.channelAccountId },
      });
    }

    if (!channel) {
      const defaultWorkspace = await this.getOrCreateDefaultWorkspace();

      let accountName = `KorevX ${event.platform}`;
      let accountHandle = `@korevx_${event.platform.toLowerCase()}`;

      if (event.recipientExternalId === '1170906462768971') {
        accountName = 'Testing.developer';
        accountHandle = '@testing.developer';
      } else if (event.recipientExternalId === '1305749670200027') {
        accountName = 'Korevx';
        accountHandle = '@korevx';
      } else if (event.recipientExternalId) {
        accountName = `Página Facebook (${event.recipientExternalId})`;
        accountHandle = `@fb_${event.recipientExternalId}`;
      }

      if (event.recipientExternalId) {
        channel = await this.prisma.channelAccount.findFirst({
          where: {
            platform: event.platform as any,
            accountName,
          },
        });

        if (!channel) {
          channel = await this.prisma.channelAccount.create({
            data: {
              workspaceId: defaultWorkspace.id,
              platform: event.platform as any,
              accountName,
              accountHandle,
              externalAccountId: event.recipientExternalId,
              accessToken: process.env.META_PAGE_ACCESS_TOKEN || 'EAABwz_demo_token_facebook',
              isActive: true,
            },
          });
        }
      } else {
        channel = await this.prisma.channelAccount.findFirst({
          where: { platform: event.platform as any },
        });

        if (!channel) {
          channel = await this.prisma.channelAccount.create({
            data: {
              workspaceId: defaultWorkspace.id,
              platform: event.platform as any,
              accountName,
              accountHandle,
              externalAccountId: `ext_${event.platform}_${Date.now()}`,
              accessToken: 'dummy_token',
              isActive: true,
            },
          });
        }
      }
    }

    const workspaceId = channel.workspaceId;

    // 2. Intentar obtener nombre y foto de perfil real del usuario vía Meta Graph API
    let senderName = event.sender.name;
    let senderAvatarUrl = event.sender.avatarUrl;

    const tokenForProfile =
      channel.accessToken &&
      !channel.accessToken.includes('demo') &&
      !channel.accessToken.includes('dummy') &&
      !channel.accessToken.includes('live-token-')
        ? channel.accessToken
        : process.env.META_PAGE_ACCESS_TOKEN;

    if (
      tokenForProfile &&
      event.platform === PlatformType.FACEBOOK &&
      event.sender.externalId &&
      event.sender.externalId !== 'unknown'
    ) {
      try {
        const profileRes = await axios.get(`https://graph.facebook.com/v21.0/${event.sender.externalId}`, {
          params: {
            fields: 'first_name,last_name,name,profile_pic',
            access_token: tokenForProfile,
          },
          timeout: 3500,
        });
        if (profileRes.data) {
          if (profileRes.data.name) {
            senderName = profileRes.data.name;
          } else if (profileRes.data.first_name) {
            senderName = `${profileRes.data.first_name} ${profileRes.data.last_name || ''}`.trim();
          }
          if (profileRes.data.profile_pic) {
            senderAvatarUrl = profileRes.data.profile_pic;
          }
        }
      } catch (profileErr) {
        this.logger.debug(
          `No se pudo obtener perfil de Facebook (${event.sender.externalId}): ${profileErr.message}`,
        );
      }
    }

    // Si aún no tenemos avatar válido, generamos un avatar estilizado con sus iniciales de ui-avatars.com
    if (!senderAvatarUrl) {
      const cleanName = senderName && !senderName.startsWith('Usuario FB') ? senderName : 'Cliente Facebook';
      senderAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=1877F2&color=fff&bold=true`;
    }

    // 3. Gestionar Identidad Social y Contacto (CRM Unificado)
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
          name: senderName,
          avatarUrl: senderAvatarUrl,
        },
      });

      identity = await this.prisma.contactSocialIdentity.create({
        data: {
          contactId: contact.id,
          platform: event.platform as any,
          externalId: event.sender.externalId,
          handle: event.sender.username,
          displayName: senderName,
          profilePicUrl: senderAvatarUrl,
        },
        include: { contact: true },
      });
    } else {
      const hasRealName = senderName && !senderName.startsWith('Usuario FB');
      const shouldUpdateName = hasRealName && contact.name.startsWith('Usuario FB');
      const shouldUpdateAvatar = Boolean(senderAvatarUrl && senderAvatarUrl !== contact.avatarUrl);

      if (shouldUpdateName || shouldUpdateAvatar) {
        contact = await this.prisma.contact.update({
          where: { id: contact.id },
          data: {
            ...(shouldUpdateName ? { name: senderName } : {}),
            ...(shouldUpdateAvatar ? { avatarUrl: senderAvatarUrl } : {}),
          },
        });
        if (identity) {
          await this.prisma.contactSocialIdentity.update({
            where: { id: identity.id },
            data: {
              ...(shouldUpdateName ? { displayName: senderName } : {}),
              ...(shouldUpdateAvatar ? { profilePicUrl: senderAvatarUrl } : {}),
            },
          });
        }
      }
    }

    // Helper para auto-asignación inteligente (Round-Robin / Menor carga a operadores del workspace)
    const findLeastBusyAgent = async () => {
      try {
        const availableAgents = await this.prisma.user.findMany({
          where: {
            workspaceId,
            role: UserRole.AGENT,
          },
          include: {
            assignedConversations: {
              where: {
                status: { in: [ConversationStatus.PENDING, ConversationStatus.ASSIGNED] },
              },
              select: { id: true },
            },
          },
        });

        if (availableAgents.length > 0) {
          // Priorizar agentes online si existen
          const onlineAgents = availableAgents.filter((a) => a.isOnline);
          const pool = onlineAgents.length > 0 ? onlineAgents : availableAgents;

          // Ordenar por menor carga activa y luego por fecha del último caso asignado (Round-Robin)
          pool.sort((a, b) => {
            const diff = a.assignedConversations.length - b.assignedConversations.length;
            if (diff !== 0) return diff;
            const timeA = a.lastAssignedAt ? new Date(a.lastAssignedAt).getTime() : 0;
            const timeB = b.lastAssignedAt ? new Date(b.lastAssignedAt).getTime() : 0;
            return timeA - timeB;
          });

          const selected = pool[0];
          await this.prisma.user.update({
            where: { id: selected.id },
            data: { lastAssignedAt: new Date() },
          });

          return selected;
        }
        return null;
      } catch (err) {
        this.logger.warn(`Error buscando agente disponible para asignación: ${err.message}`);
        return null;
      }
    };

    // 3. Obtener o crear Conversación
    let conversation = await this.prisma.conversation.findUnique({
      where: {
        channelAccountId_externalThreadId: {
          channelAccountId: channel.id,
          externalThreadId: event.externalConversationId,
        },
      },
      include: {
        contact: true,
        channelAccount: true,
        assignedUser: true,
      },
    });

    if (!conversation) {
      const leastBusyAgent = await findLeastBusyAgent();
      const assignedUserId = leastBusyAgent ? leastBusyAgent.id : null;
      const initialStatus = leastBusyAgent ? ConversationStatus.ASSIGNED : ConversationStatus.PENDING;

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
          status: initialStatus,
          assignedUserId,
          lastActivityAt: event.timestamp,
          unreadCount: 1,
        },
        include: {
          contact: true,
          channelAccount: true,
          assignedUser: true,
        },
      });

      if (leastBusyAgent) {
        this.logger.log(`Conversación auto-asignada al operador ${leastBusyAgent.fullName} (${leastBusyAgent.id})`);
      }
    } else {
      let assignedUserId = conversation.assignedUserId;
      let newStatus = conversation.status;

      // Si no tiene asignado o estaba resuelta, intentar asignar al operador menos ocupado
      if (!assignedUserId || conversation.status === ConversationStatus.RESOLVED) {
        const leastBusyAgent = await findLeastBusyAgent();
        if (leastBusyAgent) {
          assignedUserId = leastBusyAgent.id;
          newStatus = ConversationStatus.ASSIGNED;
          this.logger.log(`Conversación reasignada automáticamente al operador ${leastBusyAgent.fullName} (${leastBusyAgent.id})`);
        } else {
          newStatus = ConversationStatus.PENDING;
        }
      }

      conversation = await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          status: newStatus,
          assignedUserId,
          unreadCount: { increment: 1 },
          lastActivityAt: event.timestamp,
        },
        include: {
          contact: true,
          channelAccount: true,
          assignedUser: true,
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
