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

  async listChannels(workspaceId: string) {
    return this.prisma.channelAccount.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        platform: true,
        accountName: true,
        accountHandle: true,
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
    return adapter.sendMessage({
      ...payload,
      channelAccountId,
      accessToken: channel.accessToken,
    });
  }
}
