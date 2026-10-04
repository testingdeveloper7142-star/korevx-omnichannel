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
export class WhatsAppAdapter implements ISocialChannelAdapter {
  readonly platform = PlatformType.WHATSAPP;
  private readonly logger = new Logger(WhatsAppAdapter.name);
  private readonly graphApiVersion = 'v21.0';
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
      this.logger.error(`Error al validar firma de webhook de WhatsApp: ${err.message}`);
      return false;
    }
  }

  normalizeIncomingPayload(channelAccountId: string, rawPayload: any): CanonicalNormalizedEvent[] {
    const events: CanonicalNormalizedEvent[] = [];

    if (!rawPayload || !rawPayload.entry || !Array.isArray(rawPayload.entry)) return events;

    for (const entry of rawPayload.entry) {
      if (!entry.changes || !Array.isArray(entry.changes)) continue;

      for (const change of entry.changes) {
        if (change.field !== 'messages') continue;

        const value = change.value;
        if (!value || !value.messages || !Array.isArray(value.messages)) continue;

        const phoneNumberId = value.metadata?.phone_number_id || entry.id;
        const displayPhoneNumber = value.metadata?.display_phone_number || '';

        // Mapa de perfiles de contactos recibidos
        const contactsMap: Record<string, string> = {};
        if (value.contacts && Array.isArray(value.contacts)) {
          for (const c of value.contacts) {
            if (c.wa_id) {
              contactsMap[c.wa_id] = c.profile?.name || `+${c.wa_id}`;
            }
          }
        }

        for (const msg of value.messages) {
          const senderPhone = msg.from;
          const senderName = contactsMap[senderPhone] || `+${senderPhone}`;
          const messageId = msg.id || `wa_${Date.now()}`;
          const timestamp = msg.timestamp ? new Date(Number(msg.timestamp) * 1000) : new Date();

          let text = '';
          const mediaUrls: string[] = [];

          if (msg.type === 'text') {
            text = msg.text?.body || '';
          } else if (msg.type === 'image') {
            text = msg.image?.caption || '[Imagen]';
            if (msg.image?.id) mediaUrls.push(`wa_media_${msg.image.id}`);
          } else if (msg.type === 'video') {
            text = msg.video?.caption || '[Video]';
            if (msg.video?.id) mediaUrls.push(`wa_media_${msg.video.id}`);
          } else if (msg.type === 'audio') {
            text = '[Audio / Nota de voz]';
            if (msg.audio?.id) mediaUrls.push(`wa_media_${msg.audio.id}`);
          } else if (msg.type === 'document') {
            text = msg.document?.caption || msg.document?.filename || '[Documento]';
            if (msg.document?.id) mediaUrls.push(`wa_media_${msg.document.id}`);
          } else if (msg.type === 'location') {
            text = `[Ubicación: ${msg.location?.latitude}, ${msg.location?.longitude}]`;
          } else if (msg.type === 'contacts') {
            text = '[Contacto compartido]';
          } else {
            text = `[Mensaje ${msg.type}]`;
          }

          events.push({
            platform: PlatformType.WHATSAPP,
            channelAccountId,
            interactionType: InteractionType.DIRECT_MESSAGE,
            externalConversationId: `wa_thread_${senderPhone}`,
            externalMessageId: messageId,
            recipientExternalId: phoneNumberId,
            sender: {
              externalId: senderPhone,
              name: senderName,
              username: senderPhone,
            },
            content: text,
            mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
            timestamp,
            rawPayload: msg,
          });
        }
      }
    }

    return events;
  }

  async sendMessage(payload: OutgoingMessagePayload): Promise<SendMessageResult> {
    const phoneNumberId = payload.senderExternalId || process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!phoneNumberId) {
      this.logger.error('Falta el Identificador de número de teléfono (Phone Number ID) de WhatsApp.');
      return {
        success: false,
        externalMessageId: '',
        timestamp: new Date(),
        error: 'Falta el Identificador de número de teléfono (Phone Number ID) de WhatsApp.',
      };
    }

    const effectiveToken =
      payload.accessToken &&
      !payload.accessToken.includes('demo') &&
      !payload.accessToken.includes('dummy')
        ? payload.accessToken
        : process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_PAGE_ACCESS_TOKEN || payload.accessToken;

    try {
      const url = `${this.baseUrl}/${this.graphApiVersion}/${phoneNumberId}/messages`;

      const recipientPhone = (payload.recipientExternalId || '')
        .replace(/^wa_thread_/, '')
        .replace(/\D/g, '');

      const bodyData: any = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipientPhone,
        type: 'text',
        text: {
          preview_url: false,
          body: payload.content,
        },
      };

      const res = await axios.post(url, bodyData, {
        headers: {
          Authorization: `Bearer ${effectiveToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      const messageId = res.data?.messages?.[0]?.id || `wa_out_${Date.now()}`;
      return {
        success: true,
        externalMessageId: messageId,
        timestamp: new Date(),
      };
    } catch (err: any) {
      const metaMsg =
        err.response?.data?.error?.message ||
        err.response?.data?.error?.error_user_msg ||
        err.message;
      this.logger.error(`Error enviando mensaje vía WhatsApp Cloud API: ${metaMsg}`, err.stack);
      return {
        success: false,
        externalMessageId: '',
        timestamp: new Date(),
        error: metaMsg,
      };
    }
  }
}
