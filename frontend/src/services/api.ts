import axios from 'axios';
import { Conversation, ChannelAccount, ConversationStatus, PlatformType, InteractionType } from '../types';

export const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('korevx_backend_url');
    if (custom) return custom.replace(/\/$/, '') + '/api/v1';
    if (!window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
      return 'https://korevx-omnichannel.onrender.com/api/v1';
    }
  }
  return ((import.meta as any).env?.VITE_API_URL as string)?.replace(/\/$/, '') || '/api/v1';
};

export const api = {
  async getConversations(params?: {
    workspaceId?: string;
    status?: ConversationStatus;
    platform?: PlatformType;
    interactionType?: InteractionType;
    assignedUserId?: string;
    search?: string;
  }): Promise<Conversation[]> {
    try {
      const res = await axios.get(`${getBaseUrl()}/conversations`, { params, timeout: 5000 });
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];
    }
  },

  async getConversationById(id: string): Promise<Conversation | null> {
    try {
      const res = await axios.get(`${getBaseUrl()}/conversations/${id}`, { timeout: 5000 });
      return res.data && typeof res.data === 'object' && !Array.isArray(res.data) ? res.data : null;
    } catch {
      return null;
    }
  },

  async updateConversationStatus(
    id: string,
    status: ConversationStatus,
    assignedUserId?: string,
    performedById?: string,
  ): Promise<Conversation | null> {
    try {
      const res = await axios.patch(`${getBaseUrl()}/conversations/${id}/status`, {
        status,
        assignedUserId,
        performedById,
      });
      return res.data;
    } catch {
      return null;
    }
  },

  async replyToConversation(
    conversationId: string,
    content: string,
    mediaUrls?: string[],
    parentCommentId?: string,
    agentUserId?: string,
  ) {
    try {
      const res = await axios.post(
        `${getBaseUrl()}/conversations/${conversationId}/reply`,
        {
          content,
          mediaUrls,
          parentCommentId,
          agentUserId,
        },
        { timeout: 15000 },
      );
      return res.data;
    } catch (err: any) {
      console.error('Error enviando respuesta:', err?.response?.data || err.message);
      return null;
    }
  },

  async getChannels(workspaceId?: string): Promise<ChannelAccount[]> {
    try {
      const res = await axios.get(`${getBaseUrl()}/channels`, {
        params: workspaceId ? { workspaceId } : undefined,
        timeout: 20000,
      });
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      console.warn('Error obteniendo canales:', err);
      return [];
    }
  },

  async updateContactName(conversationId: string, name: string) {
    const res = await axios.patch(
      `${getBaseUrl()}/conversations/${conversationId}/contact`,
      { name },
      { timeout: 10000 },
    );
    return res.data;
  },

  async updateChannelToken(channelId: string, accessToken: string) {
    const res = await axios.patch(
      `${getBaseUrl()}/channels/${channelId}/token`,
      { accessToken },
      { timeout: 10000 },
    );
    return res.data;
  },

  async deleteChannel(channelId: string) {
    const res = await axios.delete(`${getBaseUrl()}/channels/${channelId}`, { timeout: 10000 });
    return res.data;
  },

  async simulateWebhookEvent(data: {
    platform: PlatformType;
    interactionType: InteractionType;
    senderName: string;
    content: string;
    postTitle?: string;
    channelId?: string;
    recipientExternalId?: string;
  }) {
    try {
      const res = await axios.post(`${getBaseUrl()}/webhooks/simulate`, data, { timeout: 15000 });
      return res.data;
    } catch {
      return null;
    }
  },
};
