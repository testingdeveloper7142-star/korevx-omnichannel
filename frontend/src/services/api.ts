import axios from 'axios';
import { Conversation, ChannelAccount, ConversationStatus, PlatformType, InteractionType } from '../types';

const API_BASE_URL = '/api/v1';

export const api = {
  async getConversations(params?: {
    workspaceId?: string;
    status?: ConversationStatus;
    platform?: PlatformType;
    interactionType?: InteractionType;
    assignedUserId?: string;
    search?: string;
  }): Promise<Conversation[]> {
    const res = await axios.get(`${API_BASE_URL}/conversations`, { params });
    return res.data;
  },

  async getConversationById(id: string): Promise<Conversation> {
    const res = await axios.get(`${API_BASE_URL}/conversations/${id}`);
    return res.data;
  },

  async updateConversationStatus(id: string, status: ConversationStatus, assignedUserId?: string): Promise<Conversation> {
    const res = await axios.patch(`${API_BASE_URL}/conversations/${id}/status`, { status, assignedUserId });
    return res.data;
  },

  async replyToConversation(
    conversationId: string,
    content: string,
    mediaUrls?: string[],
    parentCommentId?: string,
  ) {
    const res = await axios.post(`${API_BASE_URL}/conversations/${conversationId}/reply`, {
      content,
      mediaUrls,
      parentCommentId,
    });
    return res.data;
  },

  async getChannels(): Promise<ChannelAccount[]> {
    const res = await axios.get(`${API_BASE_URL}/channels`);
    return res.data;
  },

  async simulateWebhookEvent(data: {
    platform: PlatformType;
    interactionType: InteractionType;
    senderName: string;
    content: string;
    postTitle?: string;
  }) {
    const res = await axios.post(`${API_BASE_URL}/webhooks/simulate`, data);
    return res.data;
  },
};
