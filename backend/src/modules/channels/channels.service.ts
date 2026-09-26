import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { FacebookAdapter } from './adapters/facebook.adapter';
import { InstagramAdapter } from './adapters/instagram.adapter';
import { TikTokAdapter } from './adapters/tiktok.adapter';
import {
  ISocialChannelAdapter,
  PlatformType,
  OutgoingMessagePayload,
  SendMessageResult,
} from './interfaces/social-channel-adapter.interface';

@Injectable()
export class ChannelsService {
  private readonly logger = new Logger(ChannelsService.name);
  private readonly adapters = new Map<PlatformType, ISocialChannelAdapter>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly fbAdapter: FacebookAdapter,
    private readonly igAdapter: InstagramAdapter,
    private readonly ttAdapter: TikTokAdapter,
  ) {
    this.adapters.set(PlatformType.FACEBOOK, this.fbAdapter);
    this.adapters.set(PlatformType.INSTAGRAM, this.igAdapter);
    this.adapters.set(PlatformType.TIKTOK, this.ttAdapter);
  }

  getAdapter(platform: PlatformType): ISocialChannelAdapter {
    const adapter = this.adapters.get(platform);
    if (!adapter) {
      throw new BadRequestException(`No hay adaptador registrado para la plataforma: ${platform}`);
    }
    return adapter;
  }

  async listChannels(workspaceId?: string) {
    const whereClause: any = {};
    if (workspaceId && workspaceId !== 'default-workspace') {
      whereClause.workspaceId = workspaceId;
    }
    return this.prisma.channelAccount.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        platform: true,
        accountName: true,
        accountHandle: true,
        externalAccountId: true,
        avatarUrl: true,
        isActive: true,
        connectedAt: true,
        _count: {
          select: {
            conversations: true,
          },
        },
      },
    });
  }

  async getChannelById(id: string) {
    const channel = await this.prisma.channelAccount.findUnique({
      where: { id },
    });
    if (!channel) {
      throw new NotFoundException(`Canal con ID ${id} no encontrado`);
    }
    return channel;
  }

  async sendOutgoingMessage(channelAccountId: string, payload: Omit<OutgoingMessagePayload, 'accessToken' | 'channelAccountId'>): Promise<SendMessageResult> {
    const channel = await this.getChannelById(channelAccountId);
    if (!channel.isActive) {
      throw new BadRequestException(`El canal ${channel.accountName} se encuentra desconectado.`);
    }

    const adapter = this.getAdapter(channel.platform as PlatformType);
    const token =
      channel.accessToken && !channel.accessToken.includes('demo') && !channel.accessToken.includes('dummy')
        ? channel.accessToken
        : process.env.META_PAGE_ACCESS_TOKEN || channel.accessToken;

    return adapter.sendMessage({
      ...payload,
      channelAccountId,
      accessToken: token,
    });
  }

  async updateChannelToken(id: string, accessToken: string) {
    return this.prisma.channelAccount.update({
      where: { id },
      data: { accessToken, isActive: true },
    });
  }

  async createChannel(dto: {
    workspaceId: string;
    platform: PlatformType;
    accountName: string;
    accountHandle?: string;
    accessToken?: string;
  }) {
    // 1. Validar cuota permitida para esta red social en este workspace
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: dto.workspaceId },
      include: {
        channels: {
          where: { platform: dto.platform, isActive: true },
        },
        auditLogs: {
          where: { resource: { in: ['SETTINGS', 'USER'] as any } },
          orderBy: { createdAt: 'asc' },
          take: 50,
        },
      },
    });

    if (workspace) {
      let limitForPlatform = 1;
      let hasCustomLimits = false;
      for (const log of workspace.auditLogs) {
        const state = log.newState as any;
        if (state && state.channelLimits && typeof state.channelLimits[dto.platform] === 'number') {
          limitForPlatform = state.channelLimits[dto.platform];
          hasCustomLimits = true;
        }
      }

      if (hasCustomLimits && limitForPlatform <= 0) {
        throw new BadRequestException(
          `No tienes cuota asignada para conectar canales de ${dto.platform} (Límite: 0 permitidos). Contacta al Super Administrador para solicitar cuota.`
        );
      }

      if (hasCustomLimits && workspace.channels.length >= limitForPlatform) {
        throw new BadRequestException(
          `Has alcanzado el límite máximo de ${limitForPlatform} canal(es) de ${dto.platform} asignados a tu empresa.`
        );
      }
    }

    const extId = `ext-${dto.platform.toLowerCase()}-${Date.now()}`;
    return this.prisma.channelAccount.create({
      data: {
        workspaceId: dto.workspaceId,
        platform: dto.platform,
        accountName: dto.accountName,
        accountHandle: dto.accountHandle || `@${dto.accountName.toLowerCase().replace(/\s+/g, '')}`,
        externalAccountId: extId,
        accessToken: dto.accessToken?.trim() || `live-token-${Date.now()}`,
        isActive: true,
      },
    });
  }

  async deleteChannel(id: string) {
    try {
      await this.prisma.channelAccount.delete({ where: { id } });
      return { success: true };
    } catch {
      return { success: true };
    }
  }
}
