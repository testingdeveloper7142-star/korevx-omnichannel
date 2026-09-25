import { PlatformType, InteractionType } from '@prisma/client';
export { PlatformType, InteractionType };

export interface CanonicalParticipant {
  externalId: string;
  name: string;
  username?: string;
  avatarUrl?: string;
}

export interface CanonicalNormalizedEvent {
  platform: PlatformType;
  channelAccountId: string;
  interactionType: InteractionType;
  externalConversationId: string;
  externalMessageId: string;
  sender: CanonicalParticipant;
  content: string;
  mediaUrls?: string[];
  postContext?: {
    postId: string;
    postUrl?: string;
    postTitle?: string;
    postThumbnail?: string;
    parentCommentId?: string;
  };
  recipientExternalId?: string;
  timestamp: Date;
  rawPayload: any;
}

export interface OutgoingMessagePayload {
  channelAccountId: string;
  recipientExternalId: string;
  interactionType: InteractionType;
  content: string;
  mediaUrls?: string[];
  parentCommentId?: string;
  postId?: string;
  accessToken: string;
}

export interface SendMessageResult {
  success: boolean;
  externalMessageId: string;
  timestamp: Date;
  error?: string;
}

export interface ISocialChannelAdapter {
  readonly platform: PlatformType;

  /**
   * Valida la firma criptográfica del webhook (X-Hub-Signature-256 para Meta, HMAC para TikTok).
   */
  validateWebhookSignature(signature: string, rawBody: Buffer | string, secretKey: string): boolean;

  /**
   * Transforma el payload crudo del proveedor en una estructura uniforme CanonicalNormalizedEvent.
   */
  normalizeIncomingPayload(channelAccountId: string, rawPayload: any): CanonicalNormalizedEvent[];

  /**
   * Envía un mensaje o respuesta de comentario a la API oficial de la red social.
   */
  sendMessage(payload: OutgoingMessagePayload): Promise<SendMessageResult>;
}
