import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { FacebookAdapter } from '../channels/adapters/facebook.adapter';
import { InstagramAdapter } from '../channels/adapters/instagram.adapter';
import { TikTokAdapter } from '../channels/adapters/tiktok.adapter';
import { WebhooksService } from './webhooks.service';
import { CanonicalNormalizedEvent, PlatformType, InteractionType } from '../channels/interfaces/social-channel-adapter.interface';

@ApiTags('Webhooks')
@Controller('api/v1/webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly fbAdapter: FacebookAdapter,
    private readonly igAdapter: InstagramAdapter,
    private readonly ttAdapter: TikTokAdapter,
    private readonly webhooksService: WebhooksService,
  ) {}

  /**
   * Handshake de verificación Meta (Facebook & Instagram)
   */
  @Get('meta')
  @ApiOperation({ summary: 'Handshake de verificación de webhook Meta' })
  verifyMetaWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    const expectedToken = this.configService.get<string>('META_WEBHOOK_VERIFY_TOKEN') || 'korevx_webhook_verify_token_secure';
    if (mode === 'subscribe' && token === expectedToken) {
      this.logger.log('Handshake Meta Webhook verificado exitosamente');
      return challenge;
    }
    throw new ForbiddenException('Token de verificación de Meta inválido');
  }

  /**
   * Recepción de eventos en vivo de Facebook e Instagram
   */
  @Post('meta')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receptor de eventos en vivo de Meta (Facebook e Instagram)' })
  async handleMetaWebhook(
    @Headers('x-hub-signature-256') signature: string,
    @Body() body: any,
  ) {
    this.logger.log(`Payload recibido de Meta: ${body?.object}`);

    let normalizedEvents: CanonicalNormalizedEvent[] = [];

    if (body?.object === 'page') {
      // Evento de página de Facebook (Messenger o comentarios)
      normalizedEvents = this.fbAdapter.normalizeIncomingPayload('facebook-default', body);
    } else if (body?.object === 'instagram') {
      // Evento de cuenta de Instagram (DMs o comentarios)
      normalizedEvents = this.igAdapter.normalizeIncomingPayload('instagram-default', body);
    }

    if (normalizedEvents.length > 0) {
      await this.webhooksService.processNormalizedEvents(normalizedEvents);
    }

    return { status: 'EVENT_RECEIVED' };
  }

  /**
   * Recepción de eventos en vivo de TikTok
   */
  @Post('tiktok')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receptor de eventos en vivo de TikTok' })
  async handleTikTokWebhook(
    @Headers('x-tiktok-signature') signature: string,
    @Body() body: any,
  ) {
    this.logger.log('Payload recibido de TikTok');

    const normalizedEvents = this.ttAdapter.normalizeIncomingPayload('tiktok-default', body);
    if (normalizedEvents.length > 0) {
      await this.webhooksService.processNormalizedEvents(normalizedEvents);
    }

    return { status: 'EVENT_RECEIVED' };
  }

  /**
   * Endpoint de simulación para pruebas en desarrollo (permite inyectar mensajes de prueba)
   */
  @Post('simulate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Simular evento entrante de red social (Dev/Testing)' })
  async simulateIncomingEvent(
    @Body()
    dto: {
      platform: PlatformType;
      interactionType: InteractionType;
      senderName: string;
      senderId?: string;
      content: string;
      postTitle?: string;
      parentCommentId?: string;
    },
  ) {
    const senderId = dto.senderId || `sim_${Date.now()}`;
    const simulatedEvent: CanonicalNormalizedEvent = {
      platform: dto.platform || PlatformType.FACEBOOK,
      channelAccountId: `channel_${dto.platform.toLowerCase()}`,
      interactionType: dto.interactionType || InteractionType.DIRECT_MESSAGE,
      externalConversationId: `sim_conv_${senderId}`,
      externalMessageId: `sim_msg_${Date.now()}`,
      sender: {
        externalId: senderId,
        name: dto.senderName || 'Usuario Simulado',
      },
      content: dto.content || 'Mensaje de prueba simulación',
      postContext: dto.interactionType === InteractionType.POST_COMMENT ? {
        postId: `post_${Date.now()}`,
        postTitle: dto.postTitle || 'Publicación promocional KorevX',
        parentCommentId: dto.parentCommentId,
      } : undefined,
      timestamp: new Date(),
      rawPayload: dto,
    };

    await this.webhooksService.processNormalizedEvents([simulatedEvent]);
    return { success: true, event: simulatedEvent };
  }
}
