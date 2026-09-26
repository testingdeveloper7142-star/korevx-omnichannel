import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { AuthProvider, useAuth, AuthUser } from './context/AuthContext';
import { Header, MainViewType } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { InboxFeed } from './components/InboxFeed';
import { ConversationView } from './components/ConversationView';
import { MetricsDashboard } from './components/MetricsDashboard';
import { ChannelsManager } from './components/ChannelsManager';
import { LoginView } from './components/auth/LoginView';
import { AdminDashboard, Agent } from './components/dashboards/AdminDashboard';
import { SuperAdminDashboard } from './components/dashboards/SuperAdminDashboard';
import { EnterpriseMetricsDashboard } from './components/dashboards/EnterpriseMetricsDashboard';
import { EnterprisesManagerDashboard } from './components/dashboards/EnterprisesManagerDashboard';
import { TicketsView } from './components/tickets/TicketsView';
import { CompanySettingsDashboard } from './components/dashboards/CompanySettingsDashboard';
import { Conversation, PlatformType, InteractionType, ConversationStatus, ChannelAccount, AuditLogEntry, AppNotification, QuickResponse } from './types';
import { api } from './services/api';
import { socketService } from './services/socket';
import { soundManager } from './utils/audio';

const initialQuickTemplates: QuickResponse[] = [
  {
    id: 'tmpl-1',
    shortcut: '/saludo',
    title: 'Saludo Oficial KorevX',
    content: '¡Hola! Gracias por comunicarte con KorevX. ¿Cómo podemos ayudarte hoy con tus redes sociales?',
  },
  {
    id: 'tmpl-2',
    shortcut: '/precios',
    title: 'Información de Planes',
    content: 'Nuestros planes omnicanal incluyen integración completa de Instagram, Facebook y TikTok con soporte 24/7.',
  },
  {
    id: 'tmpl-3',
    shortcut: '/demo',
    title: 'Agendamiento de Demo',
    content: 'Con gusto te agendamos una demostración en vivo de nuestra plataforma omnicanal. ¿Qué horario te queda mejor?',
  },
  {
    id: 'tmpl-4',
    shortcut: '/despedida',
    title: 'chau',
    content: 'adiosito',
  },
];

const initialAuditLogs: AuditLogEntry[] = [];

const initialNotifications: AppNotification[] = [];

const initialMockConversations: Conversation[] = [];

const initialChannels: ChannelAccount[] = [];

const initialAgents: Agent[] = [];

function AppContent({ user }: { user: AuthUser }) {
  const { logout, changePassword } = useAuth();
  const [currentView, setCurrentView] = useState<MainViewType>(() => {
    if (user.role === 'SUPER_ADMIN') return 'superadmin';
    return 'inbox';
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [superAdminSection, setSuperAdminSection] = useState<'governance' | 'platformTickets' | 'supportConsole'>('governance');
  const [superAdminFilterWorkspace, setSuperAdminFilterWorkspace] = useState<string>('all');

  // Filtros
  const [selectedChannel, setSelectedChannel] = useState<PlatformType | 'all'>('all');
  const [selectedType, setSelectedType] = useState<InteractionType | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<ConversationStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const workspaceId = user?.workspaceId || 'b2d78f5f-95e6-4191-8ec6-a958e8c10bbc';
  const isDefaultWorkspace = workspaceId === 'b2d78f5f-95e6-4191-8ec6-a958e8c10bbc';

  // Estado de conversaciones con persistencia en localStorage aislada por empresa (Multi-Tenant)
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const savedScoped = localStorage.getItem(`korevx_conversations_${workspaceId}`);
    if (savedScoped) {
      try {
        const parsed = JSON.parse(savedScoped);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  });
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);

  useEffect(() => {
    if (Array.isArray(conversations)) {
      localStorage.setItem(`korevx_conversations_${workspaceId}`, JSON.stringify(conversations));
      if (isDefaultWorkspace) {
        localStorage.setItem('korevx_conversations', JSON.stringify(conversations));
      }
    }
  }, [conversations, workspaceId, isDefaultWorkspace]);

  // Estado compartido de Agentes aislado por empresa
  const [agents, setAgents] = useState<Agent[]>(() => {
    const savedScoped = localStorage.getItem(`korevx_agents_${workspaceId}`);
    if (savedScoped) {
      try {
        const parsed = JSON.parse(savedScoped);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  });

  useEffect(() => {
    if (Array.isArray(agents)) {
      localStorage.setItem(`korevx_agents_${workspaceId}`, JSON.stringify(agents));
      if (isDefaultWorkspace) {
        localStorage.setItem('korevx_agents', JSON.stringify(agents));
      }
    }
  }, [agents, workspaceId, isDefaultWorkspace]);

  // Estado compartido de Canales aislado por empresa
  const [channels, setChannels] = useState<ChannelAccount[]>(() => {
    const savedScoped = localStorage.getItem(`korevx_channels_${workspaceId}`);
    if (savedScoped) {
      try {
        const parsed = JSON.parse(savedScoped);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  });

  useEffect(() => {
    if (workspaceId) {
      axios
        .get('/api/v1/channels', { params: { workspaceId } })
        .then((res) => {
          if (Array.isArray(res.data) && res.data.length > 0) {
            setChannels(res.data);
            localStorage.setItem(`korevx_channels_${workspaceId}`, JSON.stringify(res.data));
          }
        })
        .catch(() => {});
    }
  }, [workspaceId]);

  useEffect(() => {
    if (Array.isArray(channels)) {
      localStorage.setItem(`korevx_channels_${workspaceId}`, JSON.stringify(channels));
      if (isDefaultWorkspace) {
        localStorage.setItem('korevx_channels', JSON.stringify(channels));
      }
    }
  }, [channels, workspaceId, isDefaultWorkspace]);

  // Solicitudes de Auditoría Interna aisladas por empresa
  const [auditRequests, setAuditRequests] = useState<
    Record<string, { status: 'NONE' | 'REQUESTED' | 'ACCEPTED' | 'REJECTED'; requestedBy?: string; requestedByName?: string }>
  >(() => {
    const saved = localStorage.getItem(`korevx_audit_requests_${workspaceId}`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {};
  });

  useEffect(() => {
    localStorage.setItem(`korevx_audit_requests_${workspaceId}`, JSON.stringify(auditRequests));
  }, [auditRequests, workspaceId]);

  // Cuotas de redes sociales asignadas a este workspace
  const [enterpriseLimits, setEnterpriseLimits] = useState(() => {
    try {
      const saved = localStorage.getItem(`korevx_channel_limits_${workspaceId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.FACEBOOK > 0 || parsed.INSTAGRAM > 0 || parsed.WHATSAPP > 0)) {
          return parsed;
        }
      }
    } catch {}
    try {
      const allEnts = localStorage.getItem('korevx_custom_enterprises');
      if (allEnts) {
        const list = JSON.parse(allEnts);
        const match = list.find((e: any) => e.id === workspaceId);
        if (match && match.channelLimits) {
          if (match.channelLimits.FACEBOOK > 0 || match.channelLimits.INSTAGRAM > 0 || match.channelLimits.WHATSAPP > 0) {
            return match.channelLimits;
          }
        }
      }
    } catch {}
    return { FACEBOOK: 2, INSTAGRAM: 1, WHATSAPP: 1, TIKTOK: 0 };
  });

  const [currentEnterpriseMaxOperators, setCurrentEnterpriseMaxOperators] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(`korevx_max_operators_${workspaceId}`);
      if (saved) return Number(saved) || 5;
    } catch {}
    try {
      const allEnts = localStorage.getItem('korevx_custom_enterprises');
      if (allEnts) {
        const list = JSON.parse(allEnts);
        const match = list.find((e: any) => e.id === workspaceId);
        if (match && typeof match.maxOperators === 'number') return match.maxOperators;
      }
    } catch {}
    return 5;
  });

  const [isEnterpriseSuspended, setIsEnterpriseSuspended] = useState(false);
  const [isUserBlocked, setIsUserBlocked] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;

    const syncLiveEnterpriseData = () => {
      axios
        .get('/api/v1/enterprises')
        .then((res) => {
          if (Array.isArray(res.data)) {
            const match = res.data.find((e: any) => e.id === workspaceId);
            if (match) {
              if (match.channelLimits) {
                setEnterpriseLimits(match.channelLimits);
                localStorage.setItem(`korevx_channel_limits_${workspaceId}`, JSON.stringify(match.channelLimits));
              }
              if (typeof match.maxOperators === 'number') {
                setCurrentEnterpriseMaxOperators(match.maxOperators);
                localStorage.setItem(`korevx_max_operators_${workspaceId}`, String(match.maxOperators));
              }
              if (user && user.role !== 'SUPER_ADMIN') {
                setIsEnterpriseSuspended(match.status === 'SUSPENDED');
              }
            }
          }
        })
        .catch(() => {});

      if (user && user.role !== 'SUPER_ADMIN') {
        axios
          .get(`/api/v1/enterprises/${workspaceId}/operators`)
          .then((res) => {
            if (Array.isArray(res.data) && res.data.length > 0) {
              const myUser = res.data.find((u: any) => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase());
              if (myUser?.isBlocked) {
                setIsUserBlocked(true);
              } else {
                setIsUserBlocked(false);
              }
              setAgents(res.data);
              localStorage.setItem(`korevx_agents_${workspaceId}`, JSON.stringify(res.data));
            }
          })
          .catch(() => {});
      }
    };

    syncLiveEnterpriseData();
    const interval = setInterval(syncLiveEnterpriseData, 4000);
    return () => clearInterval(interval);
  }, [workspaceId, user]);

  const currentEnterpriseLimits = enterpriseLimits;

  // Registro de Auditoría Integral (Audit Log Ley 1581) con persistencia
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    const saved = localStorage.getItem('korevx_audit_logs');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return initialAuditLogs;
  });

  useEffect(() => {
    localStorage.setItem('korevx_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  // Plantillas de Respuestas Rápidas con persistencia y sincronización
  const [quickTemplates, setQuickTemplates] = useState<QuickResponse[]>(() => {
    const saved = localStorage.getItem('korevx_quick_templates');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return initialQuickTemplates;
  });

  useEffect(() => {
    localStorage.setItem('korevx_quick_templates', JSON.stringify(quickTemplates));
  }, [quickTemplates]);

  // Notificaciones del Sistema aisladas por empresa (Multi-Tenant)
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const storageKey = user.role === 'SUPER_ADMIN' ? 'korevx_notifications' : `korevx_notifications_${workspaceId}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return user.role === 'SUPER_ADMIN' ? initialNotifications : [];
  });

  useEffect(() => {
    const storageKey = user.role === 'SUPER_ADMIN' ? 'korevx_notifications' : `korevx_notifications_${workspaceId}`;
    if (Array.isArray(notifications)) {
      localStorage.setItem(storageKey, JSON.stringify(notifications));
    }
  }, [notifications, workspaceId, user.role]);

  const [auditStartTime, setAuditStartTime] = useState<number | null>(() => {
    const saved = localStorage.getItem('korevx_audit_start_time');
    return saved ? Number(saved) : null;
  });

  interface LiveToast {
    id: string;
    title: string;
    message: string;
    type: AppNotification['type'];
  }
  const [toasts, setToasts] = useState<LiveToast[]>([]);

  const addNotification = (
    title: string,
    message: string,
    type: AppNotification['type'] = 'audit'
  ) => {
    const newNotif: AppNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title,
      message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type,
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);

    // Agregar a toasts flotantes en vivo
    const toastItem: LiveToast = {
      id: newNotif.id,
      title,
      message,
      type,
    };
    setToasts((prev) => [toastItem, ...prev.slice(0, 2)]);

    // Reproducir efecto sonoro según la categoría
    if (type === 'audit') {
      soundManager.playAuditAlert();
    } else if (type === 'security') {
      soundManager.playWarning();
    } else {
      soundManager.playNotification();
    }

    // Auto-ocultar toast después de 5.5 segundos
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newNotif.id));
    }, 5500);
  };

  const handleMarkNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const logAuditEvent = (
    action: AuditLogEntry['action'],
    details: string,
    severity: AuditLogEntry['severity'] = 'INFO'
  ) => {
    const newEntry: AuditLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleString(),
      actorId: user?.id,
      actorName: user?.fullName || 'Usuario',
      actorRole: user?.role === 'SUPER_ADMIN' ? 'Super Admin' : user?.role === 'ADMIN' ? 'Supervisor' : 'Operador',
      action,
      details,
      severity,
    };
    setAuditLogs((prev) => [newEntry, ...prev]);
  };

  const lastTrackedUserIdRef = useRef<string | null>(user?.id || null);
  useEffect(() => {
    if (user && user.id !== lastTrackedUserIdRef.current) {
      logAuditEvent(
        'USER_LOGIN',
        `Inicio de sesión exitoso de ${user.fullName} (${user.role}) en plataforma KorevX. IP y dispositivo validados conforme a Ley 1581.`,
        'INFO'
      );
      lastTrackedUserIdRef.current = user.id;
    }
  }, [user]);

  // Solicitudes pendientes de auditoría (para el Operador)
  const pendingAudits = Object.entries(auditRequests).filter(
    ([, req]) => req.status === 'REQUESTED'
  );

  // Alerta sonora al operador cuando recibe o tiene solicitudes de auditoría pendientes
  const prevPendingCountRef = useRef(0);
  useEffect(() => {
    if (user.role === 'AGENT' && pendingAudits.length > 0) {
      if (pendingAudits.length > prevPendingCountRef.current) {
        soundManager.playAuditAlert();
      }
    }
    prevPendingCountRef.current = pendingAudits.length;
  }, [user.role, pendingAudits.length]);

  const handleLogoutWithAudit = () => {
    if (user) {
      logAuditEvent(
        'USER_LOGOUT',
        `Cierre de sesión seguro de ${user.fullName} (${user.role}). Sesión finalizada y credenciales limpiadas de memoria.`,
        'INFO'
      );
      lastTrackedUserIdRef.current = null;
    }
    logout();
  };

  const handleRequestAudit = (conversationId: string) => {
    const conv = conversations.find((c) => c.id === conversationId);
    const clientName = conv?.contact?.name || 'Cliente';
    const assignedName = conv?.assignedUser?.fullName || 'Operador Asignado';

    setAuditRequests((prev) => ({
      ...prev,
      [conversationId]: {
        status: 'REQUESTED',
        requestedBy: user?.id,
        requestedByName: user?.fullName || 'Laura Morales (Supervisora)',
      },
    }));

    logAuditEvent(
      'AUDIT_REQUESTED',
      `El supervisor ${user?.fullName || 'Supervisor'} solicitó autorización para auditar la conversación de ${clientName} (asignada a ${assignedName}).`,
      'WARNING'
    );
    addNotification(
      '🔔 Solicitud de Auditoría Enviada',
      `Se solicitó autorización al operador ${assignedName} para auditar el chat de ${clientName}.`,
      'audit'
    );

    // Emitir en tiempo real al Operador por WebSockets
    socketService.emitAuditRequest({
      conversationId,
      clientName,
      requestedByName: user?.fullName || 'Laura Morales (Supervisora)',
      assignedAgentId: conv?.assignedUserId,
    });
  };

  const handleRespondAudit = (conversationId: string, accepted: boolean) => {
    const conv = conversations.find((c) => c.id === conversationId);
    const clientName = conv?.contact?.name || 'Cliente';
    const agentName = user?.fullName || 'Carlos Agente';

    setAuditRequests((prev) => ({
      ...prev,
      [conversationId]: {
        ...prev[conversationId],
        status: accepted ? 'ACCEPTED' : 'REJECTED',
      },
    }));

    if (accepted) {
      soundManager.playSuccess();
    } else {
      soundManager.playWarning();
    }

    logAuditEvent(
      accepted ? 'AUDIT_ACCEPTED' : 'AUDIT_REJECTED',
      `El operador ${agentName} ${accepted ? 'AUTORIZÓ' : 'RECHAZÓ'} la solicitud de auditoría para la conversación de ${clientName}.`,
      accepted ? 'SUCCESS' : 'ALERT'
    );
    addNotification(
      accepted ? '✓ Auditoría Autorizada' : '✕ Auditoría Rechazada',
      `El operador ${agentName} ${accepted ? 'permitió' : 'denegó'} la inspección del caso de ${clientName}.`,
      accepted ? 'general' : 'security'
    );

    // Emitir en tiempo real a Supervisión por WebSockets
    socketService.emitAuditResponse({
      conversationId,
      accepted,
      agentName,
    });
  };

  const handleLogInspection = (details: string) => {
    logAuditEvent('INSPECT_CONVERSATION', details, 'INFO');
  };

  const handleAddAgent = (newAgentData: Agent) => {
    setAgents((prev) => [...prev, newAgentData]);
    addNotification('Nuevo Operador Registrado', `${newAgentData.name} (${newAgentData.role}) fue añadido al equipo.`, 'security');
  };

  const handleToggleAgentStatus = (agentId: string) => {
    setAgents((prev) =>
      prev.map((a) => (a.id === agentId ? { ...a, isOnline: !a.isOnline } : a))
    );
  };

  const handleToggleChannelStatus = (channelId: string) => {
    setChannels((prev) =>
      prev.map((ch) => {
        if (ch.id === channelId) {
          const nextStatus = !ch.isActive;
          logAuditEvent(
            'CHANNEL_TOGGLED',
            `Canal "${ch.accountName}" (${ch.platform}) fue ${nextStatus ? 'RECONECTADO / ACTIVADO' : 'DESCONECTADO / PAUSADO'} por ${user?.fullName || 'Usuario'}.`,
            nextStatus ? 'SUCCESS' : 'WARNING'
          );
          addNotification(
            nextStatus ? 'Canal Reconectado' : 'Canal Pausado',
            `El canal "${ch.accountName}" (${ch.platform}) ahora está ${nextStatus ? 'online' : 'pausado'}.`,
            'channel'
          );
          socketService.emitChannelToggle({ channelId, isActive: nextStatus });
          return { ...ch, isActive: nextStatus };
        }
        return ch;
      })
    );
  };

  const handleAddChannel = (newChannel: ChannelAccount) => {
    setChannels((prev) => [...prev, newChannel]);
    socketService.emitChannelCreate(newChannel);
    logAuditEvent(
      'CHANNEL_CREATED',
      `Nuevo canal "${newChannel.accountName}" (${newChannel.platform}) fue CONECTADO a la plataforma por ${user?.fullName || 'Usuario'}.`,
      'SUCCESS'
    );
    addNotification(
      'Nuevo Canal Vinculado',
      `El canal "${newChannel.accountName}" (${newChannel.platform}) está listo para recibir mensajes.`,
      'channel'
    );
  };

  const handleDeleteChannel = (channelId: string) => {
    const targetChannel = channels.find((c) => c.id === channelId);
    const chanName = targetChannel ? targetChannel.accountName : 'Canal';
    const chanPlat = targetChannel ? targetChannel.platform : 'RED_SOCIAL';

    setChannels((prev) => prev.filter((c) => c.id !== channelId));
    socketService.emitChannelDelete(channelId);

    logAuditEvent(
      'CHANNEL_DELETED',
      `Canal "${chanName}" (${chanPlat}) fue ELIMINADO DEFINITIVAMENTE por ${user?.fullName || 'Usuario'}.`,
      'ALERT'
    );
    addNotification(
      'Canal Eliminado',
      `El canal "${chanName}" (${chanPlat}) fue borrado permanentemente de la plataforma.`,
      'channel'
    );
  };

  const handleAddTemplate = (newTmpl: QuickResponse) => {
    setQuickTemplates((prev) => [
      ...prev.filter((t) => t.id !== newTmpl.id && t.shortcut !== newTmpl.shortcut),
      newTmpl,
    ]);
    socketService.emitTemplateCreate(newTmpl);
    addNotification(
      'Nueva Respuesta Rápida',
      `Plantilla "${newTmpl.shortcut}" (${newTmpl.title}) guardada y sincronizada con el equipo.`,
      'ticket'
    );
  };

  const handleDeleteTemplate = (templateId: string) => {
    setQuickTemplates((prev) => prev.filter((t) => t.id !== templateId));
    socketService.emitTemplateDelete(templateId);
  };

  // Cargar datos reales desde el backend conectado a Supabase
  useEffect(() => {
    const loadFromApi = async () => {
      try {
        const data = await api.getConversations({ workspaceId });
        if (data && Array.isArray(data) && data.length > 0) {
          setConversations(data);
        }
      } catch (e) {
        // Fallback local
      }
    };
    loadFromApi();

    // WebSockets en tiempo real
    socketService.connect();
    socketService.onNewMessage((newMsg: any) => {
      setConversations((prev) => {
        const convIndex = prev.findIndex((c) => c.id === newMsg.conversationId);
        if (convIndex >= 0) {
          const existingMsgs = prev[convIndex].messages || [];
          if (existingMsgs.some((m) => m.id === newMsg.id)) {
            return prev;
          }
          const updated = [...prev];
          updated[convIndex] = {
            ...updated[convIndex],
            lastActivityAt: new Date().toISOString(),
            unreadCount: (updated[convIndex].unreadCount || 0) + 1,
            messages: [...existingMsgs, newMsg],
          };
          return updated;
        }
        return prev;
      });

      setActiveConversation((currentActive) => {
        if (currentActive && currentActive.id === newMsg.conversationId) {
          const existingMsgs = currentActive.messages || [];
          if (existingMsgs.some((m) => m.id === newMsg.id)) {
            return currentActive;
          }
          return {
            ...currentActive,
            lastActivityAt: new Date().toISOString(),
            messages: [...existingMsgs, newMsg],
          };
        }
        return currentActive;
      });
    });

    socketService.onConversationUpdated((updatedConv: any) => {
      setConversations((prev) => {
        const index = prev.findIndex((c) => c.id === updatedConv.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = { ...updated[index], ...updatedConv };
          return updated;
        }
        return [updatedConv, ...prev];
      });

      setActiveConversation((currentActive) => {
        if (currentActive && currentActive.id === updatedConv.id) {
          return {
            ...currentActive,
            ...updatedConv,
            messages: updatedConv.messages || currentActive.messages,
          };
        }
        return currentActive;
      });
    });

    // 1. Evento en tiempo real: Solicitud de auditoría enviada al Operador
    socketService.onAuditRequest((data: any) => {
      setAuditRequests((prev) => ({
        ...prev,
        [data.conversationId]: {
          status: 'REQUESTED',
          requestedByName: data.requestedByName,
        },
      }));
      soundManager.playAuditAlert();
      addNotification(
        '🚨 Solicitud de Auditoría Interna',
        `El supervisor ${data.requestedByName} solicita tu autorización para auditar el chat de ${data.clientName}.`,
        'audit'
      );
    });

    // 2. Evento en tiempo real: Respuesta de auditoría del Operador al Supervisor
    socketService.onAuditResponse((data: any) => {
      setAuditRequests((prev) => ({
        ...prev,
        [data.conversationId]: {
          ...prev[data.conversationId],
          status: data.accepted ? 'ACCEPTED' : 'REJECTED',
        },
      }));

      if (data.accepted) {
        soundManager.playSuccess();
        addNotification(
          '✓ Auditoría Autorizada por Operador',
          `El operador ${data.agentName} autorizó la inspección de la conversación.`,
          'general'
        );
      } else {
        soundManager.playWarning();
        addNotification(
          '✕ Auditoría Denegada por Operador',
          `El operador ${data.agentName} rechazó la solicitud de auditoría según Ley 1581.`,
          'security'
        );
      }
    });

    // 3. Evento en tiempo real: Operador comparte chat con Supervisión
    socketService.onConversationShare((data: any) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === data.conversationId ? { ...c, status: 'COLLABORATING' } : c
        )
      );
      setActiveConversation((current) =>
        current && current.id === data.conversationId
          ? { ...current, status: 'COLLABORATING' }
          : current
      );

      soundManager.playAuditAlert();
      addNotification(
        '🤝 Conversación Compartida por Operador',
        `El operador ${data.agentName} ha compartido el chat de ${data.clientName} contigo para asistencia conjunta.`,
        'general'
      );
      logAuditEvent(
        'CONVERSATION_SHARED',
        `El operador ${data.agentName} compartió la conversación de ${data.clientName} con el equipo de supervisión para colaboración conjunta.`,
        'INFO'
      );
    });

    // 4. Evento en tiempo real: Conversación asignada a un Operador
    socketService.onConversationAssign((data: any) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === data.conversationId
            ? {
                ...c,
                status: 'ASSIGNED',
                assignedUserId: data.assignedAgentId,
                assignedUser: { id: data.assignedAgentId, fullName: data.assignedAgentName },
              }
            : c
        )
      );
      setActiveConversation((current) =>
        current && current.id === data.conversationId
          ? {
              ...current,
              status: 'ASSIGNED',
              assignedUserId: data.assignedAgentId,
              assignedUser: { id: data.assignedAgentId, fullName: data.assignedAgentName },
            }
          : current
      );

      soundManager.playNotification();
      addNotification(
        '📥 Conversación Asignada',
        `${data.assignedByName} asignó el caso de ${data.clientName} a ${data.assignedAgentName}.`,
        'assignment'
      );
      logAuditEvent(
        'CONVERSATION_ASSIGNED',
        `Conversación de ${data.clientName} asignada a ${data.assignedAgentName} por ${data.assignedByName}.`,
        'INFO'
      );
    });

    // 5. Evento en tiempo real: Activación o Desactivación del Modo Auditoría General
    socketService.onAuditMode((data: any) => {
      setIsAuditModeActive(data.active);
      localStorage.setItem('korevx_audit_mode', String(data.active));

      if (data.active) {
        soundManager.playAuditAlert();
        addNotification(
          '👁️ Sesión de Auditoría Activa',
          `El supervisor ${data.activatedByName} ha iniciado una sesión de auditoría interna (Ley 1581) para control de calidad.`,
          'audit'
        );
        logAuditEvent(
          'AUDIT_MODE_ENABLED',
          `Modo Auditoría Interna (Ley 1581) iniciado por ${data.activatedByName}. Acceso de inspección habilitado.`,
          'WARNING'
        );
      } else {
        soundManager.playNotification();
        addNotification(
          '👁️ Sesión de Auditoría Concluida',
          `El supervisor ${data.activatedByName} ha finalizado la sesión de auditoría interna.`,
          'audit'
        );
        logAuditEvent(
          'AUDIT_MODE_DISABLED',
          `Modo Auditoría Interna finalizado por ${data.activatedByName}. Duración: ${data.duration || 'menos de 1 minuto'}.`,
          'INFO'
        );
      }
    });

    // 6. Evento en tiempo real: Caso marcado como Resuelto
    socketService.onConversationResolved((data: any) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === data.conversationId ? { ...c, status: 'RESOLVED' } : c
        )
      );
      setActiveConversation((current) =>
        current && current.id === data.conversationId
          ? { ...current, status: 'RESOLVED' }
          : current
      );

      soundManager.playSuccess();
      addNotification(
        '✓ Caso Resuelto',
        `La conversación de ${data.clientName} fue marcada como resuelta por ${data.agentName}.`,
        'general'
      );
      logAuditEvent(
        'CONVERSATION_RESOLVED',
        `Conversación de ${data.clientName} cerrada y marcada como resuelta por ${data.agentName}.`,
        'SUCCESS'
      );
    });

    // 7. Sincronización en tiempo real de Canales (entre ventanas normales e incógnito)
    socketService.onChannelSync((syncedChannels: ChannelAccount[]) => {
      if (Array.isArray(syncedChannels)) {
        const scoped = syncedChannels.filter((c) => !c.workspaceId || c.workspaceId === workspaceId);
        setChannels(scoped);
      }
    });

    socketService.onChannelCreated((newChan: ChannelAccount) => {
      if (!newChan.workspaceId || newChan.workspaceId === workspaceId) {
        setChannels((prev) => {
          if (prev.some((c) => c.id === newChan.id)) return prev;
          return [...prev, newChan];
        });
        soundManager.playNotification();
        addNotification(
          'Nuevo Canal Conectado',
          `El canal "${newChan.accountName}" (${newChan.platform}) ha sido vinculado y sincronizado.`,
          'channel'
        );
      }
    });

    // Sincronización continua de respaldo (polling cada 5s filtrado por empresa)
    const syncInterval = setInterval(async () => {
      try {
        const data = await api.getConversations({ workspaceId });
        if (data && Array.isArray(data) && data.length > 0) {
          setConversations((prev) => {
            const merged = [...prev];
            data.forEach((dbConv: any) => {
              const idx = merged.findIndex((c) => c.id === dbConv.id);
              if (idx >= 0) {
                const currentStatus = merged[idx].status;
                merged[idx] = {
                  ...merged[idx],
                  ...dbConv,
                  status: currentStatus === 'COLLABORATING' ? 'COLLABORATING' : dbConv.status,
                };
              } else {
                merged.unshift(dbConv);
              }
            });
            return merged;
          });
        }
      } catch (e) {
        // Silencioso
      }
    }, 5000);

    return () => {
      clearInterval(syncInterval);
      socketService.disconnect();
    };
  }, [workspaceId]);

  const [supportModeInfo, setSupportModeInfo] = useState<{
    active: boolean;
    enterpriseId?: string;
    enterpriseName?: string;
    adminName?: string;
    adminEmail?: string;
    activatedAt?: string;
  }>(() => {
    const saved = localStorage.getItem('korevx_support_mode_info');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return { active: localStorage.getItem('korevx_support_mode') === 'true' };
  });

  const [isSupportModeActive, setIsSupportModeActive] = useState<boolean>(() => {
    return localStorage.getItem('korevx_support_mode') === 'true';
  });

  const [isAuditModeActive, setIsAuditModeActive] = useState<boolean>(() => {
    return localStorage.getItem('korevx_audit_mode') === 'true';
  });

  const toggleSupportMode = (enabled: boolean) => {
    setIsSupportModeActive(enabled);
    localStorage.setItem('korevx_support_mode', String(enabled));

    const entName = user?.workspaceName || 'KorevX Global';
    const admName = user?.fullName || 'Administrador';

    const info = enabled
      ? {
          active: true,
          enterpriseId: workspaceId,
          enterpriseName: entName,
          adminName: admName,
          adminEmail: user?.email || 'admin@korevx.com',
          activatedAt: new Date().toLocaleString(),
        }
      : {
          active: false,
        };

    setSupportModeInfo(info);
    localStorage.setItem('korevx_support_mode_info', JSON.stringify(info));

    if (enabled) {
      soundManager.playAuditAlert();
      logAuditEvent(
        'SUPPORT_MODE_ENABLED',
        `Modo Soporte Técnico (KorevX Core) HABILITADO por ${admName} de la empresa "${entName}". Acceso autorizado para diagnóstico de plataforma conforme a Ley 1581.`,
        'WARNING'
      );
      addNotification(
        '🔧 Soporte Técnico Habilitado',
        `Has autorizado temporalmente al soporte técnico de plataforma sobre "${entName}".`,
        'security'
      );
    } else {
      soundManager.playWarning();
      logAuditEvent(
        'SUPPORT_MODE_DISABLED',
        `Modo Soporte Técnico (KorevX Core) REVOCADO por ${admName} de la empresa "${entName}". Acceso restringido nuevamente.`,
        'INFO'
      );
      addNotification(
        '🔒 Soporte Técnico Revocado',
        `Se ha deshabilitado el acceso de soporte técnico sobre "${entName}".`,
        'security'
      );
    }
  };

  useEffect(() => {
    const handleSupportUpdated = (e: any) => {
      if (e.detail) {
        setSupportModeInfo(e.detail);
        setIsSupportModeActive(Boolean(e.detail.active));
      }
    };
    window.addEventListener('korevx_support_mode_updated', handleSupportUpdated);
    return () => window.removeEventListener('korevx_support_mode_updated', handleSupportUpdated);
  }, []);

  const toggleAuditMode = (enabled: boolean) => {
    setIsAuditModeActive(enabled);
    localStorage.setItem('korevx_audit_mode', String(enabled));

    if (enabled) {
      const now = Date.now();
      setAuditStartTime(now);
      localStorage.setItem('korevx_audit_start_time', String(now));

      logAuditEvent(
        'AUDIT_MODE_ENABLED',
        `Modo Auditoría Interna (Ley 1581) ACTIVADO por ${user?.fullName || 'Supervisor'}. Acceso habilitado a conversaciones asignadas para control de calidad.`,
        'WARNING'
      );
      addNotification(
        'Auditoría Activada',
        `El supervisor ${user?.fullName || 'Supervisor'} inició una sesión de auditoría interna de calidad.`,
        'audit'
      );

      // Emitir en tiempo real a todos los operadores
      socketService.emitAuditMode({
        active: true,
        activatedByName: user?.fullName || 'Laura Morales (Supervisora)',
      });
    } else {
      let durationText = 'menos de 1 minuto';
      if (auditStartTime) {
        const diffMinutes = Math.round((Date.now() - auditStartTime) / 60000);
        durationText = diffMinutes > 0 ? `${diffMinutes} minuto(s)` : 'menos de 1 minuto';
      }
      setAuditStartTime(null);
      localStorage.removeItem('korevx_audit_start_time');

      logAuditEvent(
        'AUDIT_MODE_DISABLED',
        `Modo Auditoría Interna DESACTIVADO por ${user?.fullName || 'Supervisor'}. Duración de la sesión: ${durationText}.`,
        'INFO'
      );
      addNotification(
        'Auditoría Concluida',
        `Sesión de auditoría finalizada. Duración: ${durationText}.`,
        'audit'
      );

      // Emitir en tiempo real a todos los operadores
      socketService.emitAuditMode({
        active: false,
        activatedByName: user?.fullName || 'Laura Morales (Supervisora)',
        duration: durationText,
      });
    }
  };

  // Restricciones de navegación por Rol (Gobernanza y Privacidad Ley 1581)
  useEffect(() => {
    // 1. Operador: Solo accede a Bandeja y Tickets
    if (user.role === 'AGENT' && currentView !== 'inbox' && currentView !== 'tickets') {
      setCurrentView('inbox');
    }
    // 2. Super Admin: Solo accede a Gobernanza Total, Empresas & Admins, y Métricas Corporativas (NUNCA a chats, canales ni admin privado)
    if (
      user.role === 'SUPER_ADMIN' &&
      currentView !== 'superadmin' &&
      currentView !== 'dashboard' &&
      currentView !== 'enterprises'
    ) {
      setCurrentView('superadmin');
    }
  }, [user.role, currentView]);

  // Conversaciones accesibles según el rol del usuario (Gobernanza Multi-Tenant)
  const accessibleConversations = (conversations || []).filter((c) => {
    if (!c || !c.id) return false;

    // Si el canal está desconectado, verificar estado para Operador
    const channelConfig = channels.find(
      (ch) => ch.id === c.channelAccountId || (c.channelAccount && ch.platform === c.channelAccount.platform)
    );
    const isChannelActive = channelConfig ? channelConfig.isActive : c.channelAccount?.isActive !== false;

    // Regla Nivel 1 (Operador/Agente): Solo ve conversaciones si el canal está activo Y están asignadas a él o en cola sin asignar
    if (user.role === 'AGENT') {
      if (!isChannelActive) return false;
      const isAssignedToMe = c.assignedUserId === user.id;
      const isUnassigned = (!c.assignedUserId || c.assignedUserId === '') && c.status === 'PENDING';
      return isAssignedToMe || isUnassigned;
    }
    return true;
  });

  // Filtrado reactivo de conversaciones según los filtros seleccionados
  const filteredConversations = accessibleConversations.filter((c) => {
    if (selectedChannel !== 'all' && c.channelAccount?.platform !== selectedChannel) return false;
    if (selectedType !== 'all' && c.interactionType !== selectedType) return false;
    
    // Funcionalidad de Estados: Sin Asignar, Asignados y Resueltos
    if (selectedStatus === 'PENDING') {
      // 1. Sin Asignar: sin operador asignado y no resuelto
      const isUnassigned = (!c.assignedUserId || c.assignedUserId === '') && c.status !== 'RESOLVED';
      if (!isUnassigned) return false;
    } else if (selectedStatus === 'ASSIGNED') {
      // 2. Asignados: tiene operador asignado y no está resuelto
      const isAssigned = user.role === 'AGENT'
        ? c.assignedUserId === user.id && c.status !== 'RESOLVED'
        : Boolean(c.assignedUserId && c.assignedUserId !== '') && c.status !== 'RESOLVED';
      if (!isAssigned) return false;
    } else if (selectedStatus === 'RESOLVED') {
      // 3. Resueltos: estado cerrado
      if (c.status !== 'RESOLVED') return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = c.contact?.name ? c.contact.name.toLowerCase().includes(q) : false;
      const matchContent = c.messages?.some((m) => m?.content?.toLowerCase().includes(q));
      if (!matchName && !matchContent) return false;
    }
    return true;
  });

  // Conteo EXACTO y DINÁMICO (sin números estáticos inventados)
  const counts = {
    pending: accessibleConversations.filter(
      (c) => (!c.assignedUserId || c.assignedUserId === '') && c.status !== 'RESOLVED'
    ).length,
    assigned:
      user.role === 'AGENT'
        ? accessibleConversations.filter(
            (c) => c.assignedUserId === user.id && c.status !== 'RESOLVED',
          ).length
        : accessibleConversations.filter(
            (c) => Boolean(c.assignedUserId && c.assignedUserId !== '') && c.status !== 'RESOLVED',
          ).length,
    resolved:
      user.role === 'AGENT'
        ? accessibleConversations.filter(
            (c) => c.assignedUserId === user.id && c.status === 'RESOLVED',
          ).length
        : accessibleConversations.filter((c) => c.status === 'RESOLVED').length,
    allChannels: accessibleConversations.length,
    instagram: accessibleConversations.filter(
      (c) => c.channelAccount?.platform === 'INSTAGRAM',
    ).length,
    facebook: accessibleConversations.filter(
      (c) => c.channelAccount?.platform === 'FACEBOOK',
    ).length,
    tiktok: accessibleConversations.filter(
      (c) => c.channelAccount?.platform === 'TIKTOK',
    ).length,
    whatsapp: accessibleConversations.filter(
      (c) => c.channelAccount?.platform === 'WHATSAPP',
    ).length,
  };

  const handleSelectConversation = async (conv: Conversation) => {
    setActiveConversation(conv);
    try {
      const full = await api.getConversationById(conv.id);
      if (full && full.id === conv.id) {
        setActiveConversation(full);
        setConversations((prev) => prev.map((c) => (c.id === full.id ? full : c)));
      }
    } catch {
      // mantener conv
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!activeConversation) return;

    let savedMsg: any = null;
    try {
      savedMsg = await api.replyToConversation(
        activeConversation.id,
        text,
        undefined,
        undefined,
        user?.id,
      );
    } catch (e) {
      // Fallback local
    }

    const newMsg = savedMsg || {
      id: `msg-${Date.now()}`,
      conversationId: activeConversation.id,
      senderType: 'AGENT' as const,
      content: text,
      sentAt: new Date().toISOString(),
    };

    const updated = {
      ...activeConversation,
      status: 'ASSIGNED' as const,
      messages: [...(activeConversation.messages || []), newMsg],
    };

    setActiveConversation(updated);
    setConversations((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    soundManager.playNotification();
  };

  const handleMarkResolved = async () => {
    if (!activeConversation) return;

    try {
      await api.updateConversationStatus(activeConversation.id, 'RESOLVED');
    } catch (e) {
      // Local fallback
    }

    const updated = {
      ...activeConversation,
      status: 'RESOLVED' as const,
    };

    const clientName = activeConversation.contact.name;
    const convId = activeConversation.id;

    setActiveConversation(null);
    setConversations((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    soundManager.playSuccess();
    addNotification('Caso Resuelto', `Conversación finalizada con éxito.`, 'general');
    logAuditEvent(
      'CONVERSATION_RESOLVED',
      `Conversación de ${clientName} marcada como resuelta por ${user?.fullName || 'Operador'}.`,
      'SUCCESS'
    );

    // Emitir en tiempo real por WebSockets
    socketService.emitConversationResolved({
      conversationId: convId,
      clientName,
      agentName: user?.fullName || 'Operador',
    });
  };

  const availableAgentsList = agents.map((a) => ({
    id: a.id,
    name: a.name,
    role: a.role,
  }));

  const handleAssignUser = async (conversationId: string, userId: string) => {
    const targetAgent = agents.find((a) => a.id === userId);
    const targetConv = conversations.find((c) => c.id === conversationId);
    const newStatus: ConversationStatus = userId ? 'ASSIGNED' : 'PENDING';
    const assignedUser = userId
      ? { id: userId, fullName: targetAgent ? targetAgent.name : 'Operador Asignado' }
      : undefined;

    const updateConv = (c: Conversation) => ({
      ...c,
      status: newStatus,
      assignedUserId: userId || undefined,
      assignedUser,
    });

    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? updateConv(c) : c)),
    );

    if (activeConversation && activeConversation.id === conversationId) {
      setActiveConversation((prev) => (prev ? updateConv(prev) : null));
    }

    const clientName = targetConv?.contact?.name || 'Cliente';
    const agentName = targetAgent ? targetAgent.name : 'Cola Sin Asignar';

    logAuditEvent(
      'CONVERSATION_ASSIGNED',
      `Conversación de ${clientName} asignada a ${agentName} por ${user?.fullName || 'Supervisor'}.`,
      'INFO'
    );
    addNotification(
      'Conversación Asignada',
      `El caso de ${clientName} fue asignado a ${agentName}.`,
      'assignment'
    );
    soundManager.playNotification();

    // Emitir asignación por WebSocket en tiempo real
    if (userId) {
      socketService.emitConversationAssign({
        conversationId,
        clientName,
        assignedAgentId: userId,
        assignedAgentName: agentName,
        assignedByName: user?.fullName || 'Laura Morales (Supervisora)',
      });
    }

    try {
      await api.updateConversationStatus(conversationId, newStatus, userId || undefined);
    } catch (e) {
      // Local fallback
    }
  };

  const handleShareWithAdmin = (conversationId: string) => {
    const conv = conversations.find((c) => c.id === conversationId);
    const clientName = conv?.contact?.name || 'Cliente';
    const agentName = user?.fullName || 'Carlos Agente';

    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, status: 'COLLABORATING' } : c))
    );
    setActiveConversation((current) =>
      current && current.id === conversationId ? { ...current, status: 'COLLABORATING' } : current
    );

    soundManager.playSuccess();
    addNotification(
      '🤝 Chat Compartido con Supervisión',
      `Has compartido el caso de ${clientName} con el equipo de supervisión.`,
      'general'
    );
    logAuditEvent(
      'CONVERSATION_SHARED',
      `El operador ${agentName} compartió la conversación de ${clientName} con el equipo de supervisión para colaboración conjunta.`,
      'INFO'
    );

    // Emitir por WebSocket al Administrador en tiempo real
    socketService.emitConversationShare({
      conversationId,
      clientName,
      agentName,
    });
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#030508] text-slate-100 overflow-hidden relative">
      <Header
        currentView={currentView}
        onViewChange={(view) => {
          setCurrentView(view);
          setActiveConversation(null);
        }}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        onLogout={handleLogoutWithAudit}
        isAuditModeActive={isAuditModeActive}
        onToggleAuditMode={toggleAuditMode}
        notifications={notifications}
        onMarkNotificationsAsRead={handleMarkNotificationsAsRead}
        isSupportModeActive={isSupportModeActive}
        supportModeInfo={supportModeInfo}
        onOpenSupportConsole={() => {
          setCurrentView('superadmin');
          setSuperAdminSection('supportConsole');
        }}
      />

      <main className="flex-1 flex overflow-hidden relative z-10">
        {/* Barra lateral visible únicamente en la Bandeja */}
        {currentView === 'inbox' && !activeConversation && (
          <Sidebar
            selectedChannel={selectedChannel}
            selectedType={selectedType}
            selectedStatus={selectedStatus}
            counts={counts}
            channels={channels}
            onChannelSelect={setSelectedChannel}
            onTypeSelect={setSelectedType}
            onStatusSelect={setSelectedStatus}
            isOpenMobile={isMobileSidebarOpen}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
          />
        )}

        <div className="flex-1 flex overflow-hidden bg-[#030508]">
          {currentView === 'inbox' && user.role !== 'SUPER_ADMIN' &&
            (activeConversation ? (
              <ConversationView
                conversation={activeConversation}
                onBack={() => setActiveConversation(null)}
                onSendMessage={handleSendMessage}
                onMarkResolved={handleMarkResolved}
                onAssignUser={(agentId) => handleAssignUser(activeConversation.id, agentId)}
                onShareWithAdmin={() => handleShareWithAdmin(activeConversation.id)}
                availableAgents={availableAgentsList}
                isSupportModeActive={isSupportModeActive}
                isAuditModeActive={isAuditModeActive}
                onToggleAuditMode={toggleAuditMode}
                auditRequest={auditRequests[activeConversation.id] || { status: 'NONE' }}
                onRequestAudit={() => handleRequestAudit(activeConversation.id)}
                onRespondAudit={(accepted) => handleRespondAudit(activeConversation.id, accepted)}
                onLogInspection={handleLogInspection}
                quickTemplates={quickTemplates}
              />
            ) : (
              <InboxFeed
                conversations={filteredConversations}
                onSelectConversation={handleSelectConversation}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                counts={counts}
                availableAgents={availableAgentsList}
                onAssignUser={handleAssignUser}
                selectedChannel={selectedChannel}
                selectedType={selectedType}
                selectedStatus={selectedStatus}
                onResetFilters={() => {
                  setSelectedChannel('all');
                  setSelectedType('all');
                  setSelectedStatus('all');
                  setSearchQuery('');
                }}
                onClearChannel={() => setSelectedChannel('all')}
                onClearType={() => setSelectedType('all')}
                onClearStatus={() => setSelectedStatus('all')}
              />
            ))}

          {currentView === 'tickets' && user.role !== 'SUPER_ADMIN' && (
            <TicketsView availableAgents={availableAgentsList} />
          )}

          {currentView === 'dashboard' && (
            user.role === 'SUPER_ADMIN' ? (
              <EnterpriseMetricsDashboard
                onNavigateToSuperAdminSection={(section, filterEnterpriseName) => {
                  if (filterEnterpriseName) {
                    setSuperAdminFilterWorkspace(filterEnterpriseName);
                  }
                  if (section === 'governance' || section === 'supportConsole') {
                    setSuperAdminSection(section);
                  }
                  setCurrentView('superadmin');
                }}
              />
            ) : (
              <MetricsDashboard channels={channels} conversations={conversations} agents={agents} />
            )
          )}

          {currentView === 'channels' && user.role === 'ADMIN' && (
            <ChannelsManager
              channels={channels}
              channelLimits={currentEnterpriseLimits}
              onChannelRefresh={() => {}}
              onToggleChannelStatus={handleToggleChannelStatus}
              onAddChannel={handleAddChannel}
              onDeleteChannel={handleDeleteChannel}
            />
          )}

          {currentView === 'admin' && user.role === 'ADMIN' && (
            <AdminDashboard
              maxOperators={currentEnterpriseMaxOperators}
              agents={agents}
              conversations={conversations}
              onAddAgent={handleAddAgent}
              onToggleAgentStatus={handleToggleAgentStatus}
              quickTemplates={quickTemplates}
              onAddTemplate={handleAddTemplate}
              onDeleteTemplate={handleDeleteTemplate}
            />
          )}

          {currentView === 'settings' && user.role === 'ADMIN' && (
            <CompanySettingsDashboard
              channelLimits={currentEnterpriseLimits}
              maxOperators={currentEnterpriseMaxOperators}
              onUpdateWorkspaceName={(newName) => {
                // Sincronización reactiva del nombre de la empresa
              }}
              onClearCompanyConversations={() => {
                setConversations([]);
                setActiveConversation(null);
              }}
            />
          )}

          {currentView === 'superadmin' && user.role === 'SUPER_ADMIN' && (
            <SuperAdminDashboard
              isSupportModeActive={isSupportModeActive}
              supportModeInfo={supportModeInfo}
              activeSection={superAdminSection}
              onSectionChange={setSuperAdminSection}
              initialFilterWorkspace={superAdminFilterWorkspace}
            />
          )}

          {currentView === 'enterprises' && user.role === 'SUPER_ADMIN' && (
            <EnterprisesManagerDashboard />
          )}
        </div>
      </main>

      {/* Modal Obligatorio de Cambio de Contraseña en caso de contraseña 123456789 activa */}
      {user?.mustChangePassword && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg">
          <div className="bg-[#05080F] border-2 border-amber-500/70 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl shadow-amber-500/20 space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <span className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-lg flex-shrink-0">
                <i className="fa-solid fa-key"></i>
              </span>
              <div>
                <h3 className="text-base font-bold text-white font-tech">Cambio Obligatorio de Contraseña</h3>
                <p className="text-[11px] text-amber-400">Contraseña temporal activa (123456789)</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-[#080C14] p-3 rounded-xl border border-[#141B29]">
              Por políticas de seguridad y aislamiento multi-tenant, debes cambiar tu contraseña antes de utilizar la plataforma.
            </p>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const newP = (form.elements.namedItem('newP') as HTMLInputElement).value;
                const confP = (form.elements.namedItem('confP') as HTMLInputElement).value;

                if (newP.length < 6) {
                  alert('La contraseña debe tener al menos 6 caracteres.');
                  return;
                }
                if (newP === '123456789') {
                  alert('No puedes seguir usando la contraseña por defecto 123456789.');
                  return;
                }
                if (newP !== confP) {
                  alert('Las contraseñas no coinciden.');
                  return;
                }

                const res = await changePassword(newP);
                if (!res.success) {
                  alert(res.error || 'Error actualizando contraseña');
                } else {
                  soundManager.playSuccess();
                }
              }}
              className="space-y-4 pt-1"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 font-tech">
                  Nueva Contraseña (mínimo 6 caracteres)
                </label>
                <input
                  name="newP"
                  type="password"
                  required
                  placeholder="Tu nueva clave segura"
                  className="w-full px-3.5 py-2.5 bg-[#080C14] border border-[#141B29] focus:border-amber-400 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 font-tech">
                  Confirmar Nueva Contraseña
                </label>
                <input
                  name="confP"
                  type="password"
                  required
                  placeholder="Repite la nueva contraseña"
                  className="w-full px-3.5 py-2.5 bg-[#080C14] border border-[#141B29] focus:border-amber-400 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-amber-500/20 font-tech uppercase tracking-wider"
              >
                <i className="fa-solid fa-lock-open"></i>
                <span>Guardar y Entrar a KorevX</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Banner Global Flotante de Solicitud de Auditoría para el Operador (Visible en cualquier vista) */}
      {user?.role === 'AGENT' && pendingAudits.length > 0 && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[9999] w-[94%] max-w-2xl bg-[#060B17]/95 backdrop-blur-xl border-2 border-amber-500/70 rounded-2xl p-4 sm:p-5 shadow-2xl shadow-amber-500/30">
          {pendingAudits.map(([convId, req]) => {
            const conv = conversations.find((c) => c.id === convId);
            const clientName = conv?.contact?.name || 'Cliente';
            return (
              <div key={convId} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/50 flex items-center justify-center text-base flex-shrink-0">
                    <i className="fa-solid fa-triangle-exclamation animate-bounce"></i>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-amber-300 uppercase tracking-wider font-tech">
                        Solicitud de Auditoría Interna (Ley 1581)
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold">
                        Acción Requerida
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                      El supervisor <strong className="text-white font-semibold">{req.requestedByName || 'Laura Morales'}</strong> solicita acceso temporal para auditar y monitorear la conversación privada con <strong className="text-[#00F0FF] font-semibold">{clientName}</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-shrink-0">
                  <button
                    onClick={() => handleRespondAudit(convId, false)}
                    className="px-3.5 py-2 rounded-xl bg-[#0B111E] hover:bg-rose-950/60 hover:text-rose-300 text-slate-300 border border-slate-700/60 hover:border-rose-500/50 text-xs font-semibold transition flex items-center gap-1.5"
                  >
                    <i className="fa-solid fa-xmark text-rose-400"></i>
                    <span>Denegar</span>
                  </button>
                  <button
                    onClick={() => handleRespondAudit(convId, true)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/30 flex items-center gap-1.5"
                  >
                    <i className="fa-solid fa-check"></i>
                    <span>✓ Autorizar Acceso</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Toasts Flotantes de Notificaciones en Vivo con Sonido */}
      <div className="fixed bottom-5 right-5 z-[9998] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-3.5 rounded-2xl border shadow-2xl backdrop-blur-xl flex items-start gap-3 transition-all duration-300 ${
              toast.type === 'audit'
                ? 'bg-[#0E1524]/95 border-amber-500/60 shadow-amber-500/25 text-amber-200'
                : toast.type === 'security'
                ? 'bg-[#180C14]/95 border-rose-500/60 shadow-rose-500/25 text-rose-200'
                : toast.type === 'channel'
                ? 'bg-[#081520]/95 border-cyan-500/60 shadow-cyan-500/25 text-cyan-200'
                : 'bg-[#08141F]/95 border-[#00F0FF]/50 shadow-[#00F0FF]/20 text-slate-200'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs ${
                toast.type === 'audit'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : toast.type === 'security'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40'
              }`}
            >
              <i
                className={`fa-solid ${
                  toast.type === 'audit'
                    ? 'fa-triangle-exclamation'
                    : toast.type === 'security'
                    ? 'fa-shield-halved'
                    : 'fa-bell'
                }`}
              ></i>
            </div>
            <div className="flex-1 min-w-0">
              <h5 className="text-xs font-bold text-white font-tech">{toast.title}</h5>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">{toast.message}</p>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="text-slate-400 hover:text-white text-xs p-1"
              title="Cerrar notificación"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        ))}
      </div>
      {/* Bloqueo Total de Acceso si la Empresa fue Suspendida por Super Admin */}
      {isEnterpriseSuspended && user?.role !== 'SUPER_ADMIN' && (
        <div className="fixed inset-0 z-[999999] bg-[#030508]/95 backdrop-blur-2xl flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full p-8 rounded-3xl bg-[#080C14] border-2 border-rose-500/60 shadow-2xl shadow-rose-950/70 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center text-3xl mx-auto shadow-lg shadow-rose-500/20">
              <i className="fa-solid fa-ban"></i>
            </div>
            <h2 className="text-xl font-bold text-white font-tech">Empresa Suspendida</h2>
            <p className="text-xs text-slate-300 leading-relaxed font-tech">
              El acceso para la organización <strong className="text-white">"{user.workspaceName || 'tu empresa'}"</strong> ha sido suspendido temporalmente por el Super Administrador de KorevX.
            </p>
            <p className="text-[11px] text-slate-500 font-tech">
              Por razones de gobernanza y control, todas las operaciones han sido inhabilitadas. Contacta a soporte central para regularizar tu acceso.
            </p>
            <button
              onClick={handleLogoutWithAudit}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs font-tech transition shadow-lg shadow-rose-600/30 uppercase tracking-wider"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      )}

      {/* Bloqueo Individual si el Usuario fue Bloqueado */}
      {isUserBlocked && user?.role !== 'SUPER_ADMIN' && (
        <div className="fixed inset-0 z-[999999] bg-[#030508]/95 backdrop-blur-2xl flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full p-8 rounded-3xl bg-[#080C14] border-2 border-rose-500/60 shadow-2xl shadow-rose-950/70 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center text-3xl mx-auto shadow-lg shadow-rose-500/20">
              <i className="fa-solid fa-user-lock"></i>
            </div>
            <h2 className="text-xl font-bold text-white font-tech">Usuario Bloqueado</h2>
            <p className="text-xs text-slate-300 leading-relaxed font-tech">
              Tu cuenta individual ha sido bloqueada por el Administrador. No tienes permisos para gestionar ni responder conversaciones en la plataforma.
            </p>
            <button
              onClick={handleLogoutWithAudit}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs font-tech transition shadow-lg shadow-rose-600/30 uppercase tracking-wider"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    console.error('KorevX Runtime Error Boundary caught:', error, info);
  }

  handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#030508] flex items-center justify-center p-6 text-slate-100 font-sans">
          <div className="max-w-md w-full bg-[#070C16] border border-[#162133] rounded-3xl p-8 shadow-2xl text-center space-y-5">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/30 flex items-center justify-center text-2xl">
              <i className="fa-solid fa-rotate-right"></i>
            </div>
            <div>
              <h2 className="text-xl font-bold font-tech text-white">Recuperación de Plataforma</h2>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Se detectó una inconsistencia de datos temporales en el navegador. Haz clic abajo para restaurar la interfaz limpia.
              </p>
              {this.state.error && (
                <div className="mt-3 p-2 rounded-lg bg-rose-950/40 border border-rose-500/30 text-[11px] text-rose-300 font-mono text-left break-all">
                  {this.state.error.message}
                </div>
              )}
            </div>
            <button
              onClick={this.handleReset}
              className="w-full py-3 bg-[#00F0FF] hover:bg-[#00D7E5] text-[#030508] font-bold text-xs uppercase tracking-wider rounded-xl font-tech transition shadow-lg shadow-[#00F0FF]/20"
            >
              Restaurar y Recargar Plataforma
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppRoot() {
  const { user } = useAuth();

  if (!user) {
    return <LoginView onSuccess={() => {}} />;
  }

  return <AppContent key={user.id} user={user} />;
}

export function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppRoot />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
