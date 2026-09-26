export type PlatformType = 'FACEBOOK' | 'INSTAGRAM' | 'TIKTOK' | 'WHATSAPP' | 'TWITTER_X' | 'LINKEDIN';

export type InteractionType = 'DIRECT_MESSAGE' | 'POST_COMMENT';

export type ConversationStatus = 'PENDING' | 'ASSIGNED' | 'COLLABORATING' | 'RESOLVED';

export type TicketType = 'OPERATOR_TO_ADMIN' | 'ADMIN_TO_SUPERADMIN';

export type TicketCategory =
  | 'SPECIAL_APPROVAL'
  | 'DISCOUNT_AUTHORIZATION'
  | 'L2_SUPPORT'
  | 'ARCO_PRIVACY'
  | 'TECH_PLATFORM_ISSUE'
  | 'WEBHOOKS_FAILURE'
  | 'BILLING'
  | 'OTHER';

export type TicketStatus = 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'CANCELLED';

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface InternalTicket {
  id: string;
  ticketNumber: number;
  workspaceId: string;
  type: TicketType;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  title: string;
  description: string;
  createdById: string;
  assignedToId?: string;
  conversationId?: string;
  supportModeRequested: boolean;
  supportModeGranted: boolean;
  resolutionNotes?: string;
  resolvedAt?: string;
  createdAt: string;
  createdBy?: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
  assignedTo?: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
  workspace?: {
    id: string;
    name: string;
  };
  conversation?: {
    id: string;
    status: string;
    interactionType: string;
    contact?: {
      name: string;
    };
  };
}

export type SenderType = 'CUSTOMER' | 'AGENT' | 'BOT';

export interface ChannelAccount {
  id: string;
  workspaceId: string;
  platform: PlatformType;
  accountName: string;
  accountHandle?: string;
  avatarUrl?: string;
  accessToken?: string;
  isActive: boolean;
  connectedAt: string;
  _count?: {
    conversations: number;
  };
}

export interface ContactSocialIdentity {
  id: string;
  platform: PlatformType;
  externalId: string;
  handle?: string;
  displayName?: string;
  profilePicUrl?: string;
}

export interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  socialIdentities?: ContactSocialIdentity[];
  notes?: Array<{
    id: string;
    content: string;
    createdAt: string;
    author: {
      fullName: string;
    };
  }>;
}

export interface Message {
  id: string;
  conversationId: string;
  senderType: SenderType;
  senderUserId?: string;
  externalMessageId?: string;
  content: string;
  mediaUrls?: string[];
  parentCommentId?: string;
  rawPayload?: any;
  sentAt: string;
}

export interface Conversation {
  id: string;
  workspaceId: string;
  channelAccountId: string;
  contactId: string;
  assignedUserId?: string;
  externalThreadId: string;
  interactionType: InteractionType;
  postId?: string;
  postUrl?: string;
  postTitle?: string;
  postThumbnail?: string;
  status: ConversationStatus;
  priority?: string;
  unreadCount: number;
  lastActivityAt: string;
  contact: Contact;
  channelAccount: ChannelAccount;
  assignedUser?: {
    id: string;
    fullName: string;
    avatarUrl?: string;
  };
  messages?: Message[];
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorId?: string;
  actorName: string;
  actorRole: string;
  action:
    | 'AUDIT_MODE_ENABLED'
    | 'AUDIT_MODE_DISABLED'
    | 'INSPECT_CONVERSATION'
    | 'AUDIT_REQUESTED'
    | 'AUDIT_ACCEPTED'
    | 'AUDIT_REJECTED'
    | 'CHANNEL_CREATED'
    | 'CHANNEL_TOGGLED'
    | 'CHANNEL_DELETED'
    | 'CONVERSATION_ASSIGNED'
    | 'CONVERSATION_RESOLVED'
    | 'CONVERSATION_SHARED'
    | 'CONVERSATION_COLLABORATION_ENDED'
    | 'SUPPORT_MODE_ENABLED'
    | 'SUPPORT_MODE_DISABLED'
    | 'USER_LOGIN'
    | 'USER_LOGOUT';
  details: string;
  severity: 'INFO' | 'WARNING' | 'ALERT' | 'SUCCESS';
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'audit' | 'channel' | 'assignment' | 'security' | 'ticket' | 'general';
  read: boolean;
}

export interface QuickResponse {
  id: string;
  shortcut: string;
  title: string;
  content: string;
}


