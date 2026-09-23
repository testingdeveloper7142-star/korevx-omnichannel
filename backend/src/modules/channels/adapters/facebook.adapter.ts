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
export class FacebookAdapter implements ISocialChannelAdapter {
  readonly platform = PlatformType.FACEBOOK;
  private readonly logger = new Logger(FacebookAdapter.name);
  private readonly graphApiVersion = 'v19.0';
  private readonly baseUrl = 'https://graph.facebook.com';

  validateWebhookSignature(signature: string, rawBody: Buffer | string, secretKey: string): boolean {
    if (!signature || !secretKey) return false;
    try {
      const parts = signature.split('=');
      if (parts.length !== 2 || parts[0] !== 'sha256') return false;
      const expectedHash = parts[1];

      const hmac = crypto.createHmac('sha256', secretKey);
      hmac.update(typeof rawBody === 'string' ? Buffer.from(rawBody, 'utf8') : rawBody);
      const calculatedHash = hmac.digest('hex');

      return crypto.timingSafeEqual(Buffer.from(calculatedHash, 'hex'), Buffer.from(expectedHash, 'hex'));
    } catch (err) {
      this.logger.error(`Error al validar firma de webhook de Facebook: ${err.message}`);
      return false;
    }
  }

  normalizeIncomingPayload(channelAccountId: string, rawPayload: any): CanonicalNormalizedEvent[] {
    const events: CanonicalNormalizedEvent[] = [];

    if (!rawPayload || !rawPayload.entry) return events;

    for (const entry of rawPayload.entry) {
      // 1. Mensajes Directos (Messenger)
      if (entry.messaging && Array.isArray(entry.messaging)) {
        for (const msgItem of entry.messaging) {
          if (msgItem.message && !msgItem.message.is_echo) {
            const senderId = msgItem.sender?.id || 'unknown';
            const messageId = msgItem.message.mid || `fb_${Date.now()}`;
            const text = msgItem.message.text || '';
            const mediaUrls: string[] = [];

            if (msgItem.message.attachments) {
              for (const att of msgItem.message.attachments) {
                if (att.payload?.url) {
                  mediaUrls.push(att.payload.url);
                }
              }
            }

            events.push({
              platform: PlatformType.FACEBOOK,
              channelAccountId,
              interactionType: InteractionType.DIRECT_MESSAGE,
              externalConversationId: `fb_thread_${senderId}`,
              externalMessageId: messageId,
              sender: {
                externalId: senderId,
                name: `Usuario FB (${senderId.substring(0, 6)})`,
              },
              content: text,
              mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
              timestamp: new Date(msgItem.timestamp || Date.now()),
              rawPayload: msgItem,
            });
          }
        }
      }

      // 2. Comentarios en Publicaciones (Feed Changes)
      if (entry.changes && Array.isArray(entry.changes)) {
        for (const change of entry.changes) {
          if (change.field === 'feed' && change.value?.item === 'comment' && change.value?.verb === 'add') {
            const comment = change.value;
            const senderId = comment.from?.id || 'unknown';
            const senderName = comment.from?.name || `Usuario FB (${senderId.substring(0, 6)})`;
            const commentId = comment.comment_id || `comment_${Date.now()}`;
            const postId = comment.post_id || entry.id;

            events.push({
              platform: PlatformType.FACEBOOK,
              channelAccountId,
              interactionType: InteractionType.POST_COMMENT,
              externalConversationId: `fb_post_${postId}`,
              externalMessageId: commentId,
              sender: {
                externalId: senderId,
                name: senderName,
              },
              content: comment.message || '',
              mediaUrls: comment.photo ? [comment.photo] : undefined,
              postContext: {
                postId,
                parentCommentId: comment.parent_id !== postId ? comment.parent_id : undefined,
              },
              timestamp: new Date((comment.created_time || Date.now() / 1000) * 1000),
              rawPayload: change,
            });
          }
        }
      }
    }

    return events;
  }

  async sendMessage(payload: OutgoingMessagePayload): Promise<SendMessageResult> {
    try {
      if (payload.interactionType === InteractionType.POST_COMMENT) {
        // Responder a comentario en publicación
        const targetId = payload.parentCommentId || payload.postId;
        const url = `${this.baseUrl}/${this.graphApiVersion}/${targetId}/comments`;
        const res = await axios.post(
          url,
          { message: payload.content },
          {
            headers: {
              Authorization: `Bearer ${payload.accessToken}`,
              'Content-Type': 'application/json',
            },
          },
        );

        return {
          success: true,
          externalMessageId: res.data.id,
          timestamp: new Date(),
        };
      } else {
        // Enviar mensaje directo por Messenger
        const url = `${this.baseUrl}/${this.graphApiVersion}/me/messages`;
        const res = await axios.post(
          url,
          {
            recipient: { id: payload.recipientExternalId },
            message: { text: payload.content },
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
          externalMessageId: res.data.message_id,
          timestamp: new Date(),
        };
      }
    } catch (err) {
      this.logger.error(`Error enviando mensaje vía Facebook API: ${err.response?.data?.error?.message || err.message}`);
      return {
        success: false,
        externalMessageId: '',
        timestamp: new Date(),
        error: err.response?.data?.error?.message || err.message,
      };
    }
  }
}
