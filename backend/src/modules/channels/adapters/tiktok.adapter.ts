import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import axios from 'axios';
import {
  ISocialChannelAdapter,
  PlatformType,
  InteractionType,
  CanonicalNormalizedEvent,
  OutgoingMessagePayload,
  SendMessageResult,
} from '../interfaces/social-channel-adapter.interface';

@Injectable()
export class TikTokAdapter implements ISocialChannelAdapter {
  readonly platform = PlatformType.TIKTOK;
  private readonly logger = new Logger(TikTokAdapter.name);
  private readonly openApiBaseUrl = 'https://open.tiktokapis.com/v2';

  validateWebhookSignature(signature: string, rawBody: Buffer | string, secretKey: string): boolean {
    if (!signature || !secretKey) return false;
    try {
      const hmac = crypto.createHmac('sha256', secretKey);
      hmac.update(typeof rawBody === 'string' ? Buffer.from(rawBody, 'utf8') : rawBody);
      const calculatedHash = hmac.digest('hex');

      return crypto.timingSafeEqual(Buffer.from(calculatedHash, 'hex'), Buffer.from(signature, 'hex'));
    } catch (err) {
      this.logger.error(`Error al validar firma de webhook de TikTok: ${err.message}`);
      return false;
    }
  }

  normalizeIncomingPayload(channelAccountId: string, rawPayload: any): CanonicalNormalizedEvent[] {
    const events: CanonicalNormalizedEvent[] = [];

    if (!rawPayload) return events;

    const eventType = rawPayload.event || rawPayload.event_type;
    const data = rawPayload.data || rawPayload.content;

    // 1. Comentarios en Videos de TikTok
    if (eventType === 'comment.create' || eventType === 'video.comment' || data?.comment_id) {
      const commentId = data?.comment_id || `tt_comment_${Date.now()}`;
      const videoId = data?.video_id || rawPayload.item_id || 'unknown_video';
      const senderOpenId = data?.user?.open_id || data?.user_id || 'unknown_tt_user';
      const senderName = data?.user?.display_name || `@tiktok_user_${senderOpenId.substring(0, 6)}`;
      const avatarUrl = data?.user?.avatar_url;
      const text = data?.text || data?.content || '';

      events.push({
        platform: PlatformType.TIKTOK,
        channelAccountId,
        interactionType: InteractionType.POST_COMMENT,
        externalConversationId: `tiktok_video_${videoId}`,
        externalMessageId: commentId,
        sender: {
          externalId: senderOpenId,
          name: senderName,
          avatarUrl,
        },
        content: text,
        postContext: {
          postId: videoId,
          parentCommentId: data?.parent_comment_id,
        },
        timestamp: new Date(data?.create_time ? data.create_time * 1000 : Date.now()),
        rawPayload,
      });
    }

    // 2. Mensajes Directos de TikTok (Direct Message API)
    if (eventType === 'im.message.receive' || eventType === 'direct_message' || (data?.conversation_id && !data?.video_id)) {
      const messageId = data?.message_id || `tt_msg_${Date.now()}`;
      const convId = data?.conversation_id || `tt_chat_${data?.from_user_id || 'unknown'}`;
      const senderId = data?.from_user_id || 'unknown_tt_user';
      const text = data?.text || data?.body?.text || '';

      events.push({
        platform: PlatformType.TIKTOK,
        channelAccountId,
        interactionType: InteractionType.DIRECT_MESSAGE,
        externalConversationId: convId,
        externalMessageId: messageId,
        sender: {
          externalId: senderId,
          name: `@tiktok_user_${senderId.substring(0, 6)}`,
        },
        content: text,
        timestamp: new Date(data?.create_time ? data.create_time * 1000 : Date.now()),
        rawPayload,
      });
    }

    return events;
  }

  async sendMessage(payload: OutgoingMessagePayload): Promise<SendMessageResult> {
    try {
      if (payload.interactionType === InteractionType.POST_COMMENT) {
        // Responder a comentario en video de TikTok
        const url = `${this.openApiBaseUrl}/video/comment/reply/`;
        const res = await axios.post(
          url,
          {
            video_id: payload.postId,
            comment_id: payload.parentCommentId,
            content: payload.content,
          },
          {
            headers: {
              Authorization: `Bearer ${payload.accessToken}`,
              'Content-Type': 'application/json',
            },
          },
        );

        return {
          success: true,
          externalMessageId: res.data?.data?.comment_id || `tt_rep_${Date.now()}`,
          timestamp: new Date(),
        };
      } else {
        // Enviar DM en TikTok
        const url = `${this.openApiBaseUrl}/im/message/send/`;
        const res = await axios.post(
          url,
          {
            to_user_id: payload.recipientExternalId,
            message_type: 'text',
            content: JSON.stringify({ text: payload.content }),
          },
          {
            headers: {
              Authorization: `Bearer ${payload.accessToken}`,
              'Content-Type': 'application/json',
            },
          },
        );

        return {
          success: true,
          externalMessageId: res.data?.data?.server_message_id || `tt_msg_${Date.now()}`,
          timestamp: new Date(),
        };
      }
    } catch (err) {
      this.logger.error(`Error enviando mensaje vía TikTok API: ${err.response?.data?.message || err.message}`);
      return {
        success: false,
        externalMessageId: '',
        timestamp: new Date(),
        error: err.response?.data?.message || err.message,
      };
    }
  }
}
