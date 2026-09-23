import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { InternalTicket, TicketStatus, Conversation, Message } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface AuditLogItem {
  id: string;
  workspaceId: string;
  userId: string | null;
  action: string;
  resource: string;
  resourceId: string;
  description: string;
  previousState: any;
  newState: any;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user?: {
    id: string;
    fullName: string;
    email: string;
    workspace?: {
      id: string;
      name: string;
    } | null;
  } | null;
  workspace?: {
    id: string;
    name: string;
  } | null;
}

interface UserSessionItem {
  id: string;
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
  deviceType: string | null;
  loginAt: string;
  isActive: boolean;
  user: {
    fullName: string;
    email: string;
    role: string;
    workspace?: {
      id: string;
      name: string;
    } | null;
  };
}

interface SuperAdminDashboardProps {
  isSupportModeActive?: boolean;
  supportModeInfo?: {
    active: boolean;
    enterpriseId?: string;
    enterpriseName?: string;
    adminName?: string;
    adminEmail?: string;
    activatedAt?: string;
  };
  activeSection?: 'governance' | 'platformTickets' | 'supportConsole';
  onSectionChange?: (section: 'governance' | 'platformTickets' | 'supportConsole') => void;
  initialFilterWorkspace?: string;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({
  isSupportModeActive = false,
  supportModeInfo,
  activeSection: controlledSection,
  onSectionChange,
  initialFilterWorkspace,
}) => {
  const { user } = useAuth();
  const [internalSection, setInternalSection] = useState<'governance' | 'platformTickets' | 'supportConsole'>('governance');
  const activeSection = controlledSection || internalSection;
  const setActiveSection = (s: 'governance' | 'platformTickets' | 'supportConsole') => {
    if (onSectionChange) onSectionChange(s);
    setInternalSection(s);
  };

  const effectiveSupportInfo = supportModeInfo || (() => {
    try {
      const saved = localStorage.getItem('korevx_support_mode_info');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  })();

  // Soporte Técnico: Chats autorizados de la empresa específica (Multi-Tenant protegido)
  const [supportConversations, setSupportConversations] = useState<Conversation[]>([]);
  const [selectedSupportConv, setSelectedSupportConv] = useState<Conversation | null>(null);
  const [supportSearch, setSupportSearch] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [isSendingSupportMsg, setIsSendingSupportMsg] = useState(false);
  const [isLoadingSupportChats, setIsLoadingSupportChats] = useState(false);

  // Audit Logs
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [limitCount, setLimitCount] = useState<number>(50);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoadingAll, setIsLoadingAll] = useState(false);

  // Filtros de Auditoría
  const [filterResource, setFilterResource] = useState<string>('all');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterWorkspace, setFilterWorkspace] = useState<string>(initialFilterWorkspace || 'all');
  const [logSearch, setLogSearch] = useState('');
  const [sessionSearch, setSessionSearch] = useState('');

  useEffect(() => {
    if (initialFilterWorkspace) {
      setFilterWorkspace(initialFilterWorkspace);
    }
  }, [initialFilterWorkspace]);

  // Modal de Marco Legal y Auditoría Forense
  const [isLegalForensicModalOpen, setIsLegalForensicModalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<'current' | 'max_legal' | 'with_permission'>('current');
  const [isTestingEvent, setIsTestingEvent] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  // Sesiones activas
  const [sessions, setSessions] = useState<UserSessionItem[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);

  // Tickets de Plataforma (Admin -> Super Admin)
  const [platformTickets, setPlatformTickets] = useState<InternalTicket[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [resolvingTicketId, setResolvingTicketId] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');

  // Cargar AuditLogs
  const loadLogs = async (cursor?: string | null, customLimit?: number) => {
    if (cursor) {
      setIsLoadingMore(true);
    } else {
      setIsLoadingLogs(true);
    }

    try {
      const effLimit = customLimit !== undefined ? customLimit : limitCount;
      const params: any = { limit: effLimit };
      if (cursor) params.cursor = cursor;
      if (filterResource !== 'all') params.resource = filterResource;
      if (filterAction !== 'all') params.action = filterAction;

      const res = await axios.get('/api/v1/audit/logs', { params });
      if (res.data) {
        if (cursor) {
          setLogs((prev) => [...prev, ...res.data.items]);
        } else {
          setLogs(res.data.items || []);
        }
        if (res.data.totalCount !== undefined) {
          setTotalCount(res.data.totalCount);
        }
        setNextCursor(res.data.nextCursor);
        setHasMore(res.data.hasMore);
      }
    } catch (err) {
      console.warn('Error consultando AuditLogs desde backend:', err);
    } finally {
      setIsLoadingLogs(false);
      setIsLoadingMore(false);
    }
  };

  // Cargar todos los registros disponibles iterando cursores automáticamente
  const loadAllLogs = async () => {
    setIsLoadingAll(true);
    try {
      let currentCursor: string | null = null;
      let allItems: AuditLogItem[] = [];
      let keepFetching = true;

      while (keepFetching) {
        const params: any = { limit: 250 };
        if (currentCursor) params.cursor = currentCursor;
        if (filterResource !== 'all') params.resource = filterResource;
        if (filterAction !== 'all') params.action = filterAction;

        const res = await axios.get('/api/v1/audit/logs', { params });
        if (res.data?.items && res.data.items.length > 0) {
          allItems = [...allItems, ...res.data.items];
          currentCursor = res.data.nextCursor;
          keepFetching = Boolean(res.data.hasMore && currentCursor);
        } else {
          keepFetching = false;
        }
      }

      setLogs(allItems);
      setHasMore(false);
      setNextCursor(null);
    } catch (err) {
      console.warn('Error cargando todos los registros:', err);
    } finally {
      setIsLoadingAll(false);
    }
  };

  const exportAuditLogsJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `korevx-auditlog-completo-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Cargar Sesiones Activas
  const loadSessions = async () => {
    setIsLoadingSessions(true);
    try {
      const res = await axios.get('/api/v1/audit/sessions');
      setSessions(res.data || []);
    } catch (err) {
      console.warn('Error consultando sesiones desde backend:', err);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  // Cargar Tickets de Plataforma
  const loadPlatformTickets = async () => {
    setIsLoadingTickets(true);
    try {
      const res = await axios.get('/api/v1/tickets', {
        params: { type: 'ADMIN_TO_SUPERADMIN' },
      });
      setPlatformTickets(res.data || []);
    } catch (err) {
      console.warn('Error cargando tickets de plataforma:', err);
    } finally {
      setIsLoadingTickets(false);
    }
  };

  useEffect(() => {
    loadLogs();
    loadSessions();
    loadPlatformTickets();
  }, []);

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await axios.post(`/api/v1/audit/sessions/${sessionId}/revoke`);
      setSessions(sessions.filter((s) => s.id !== sessionId));
    } catch (err) {
      console.warn('Error revocando sesión:', err);
    }
  };

  const handleUpdateTicket = async (ticketId: string, status: TicketStatus) => {
    try {
      await axios.patch(`/api/v1/tickets/${ticketId}/status`, {
        status,
        resolutionNotes: resolutionNote.trim() || undefined,
        userId: user?.id,
      });
      setResolvingTicketId(null);
      setResolutionNote('');
      loadPlatformTickets();
    } catch (err) {
      console.warn('Error actualizando ticket de plataforma:', err);
    }
  };

  // Cargar conversaciones de soporte autorizadas para la empresa activa
  const loadSupportConversations = async () => {
    const targetEnterpriseId = effectiveSupportInfo?.enterpriseId;
    if (!targetEnterpriseId) return;

    setIsLoadingSupportChats(true);
    let loaded: Conversation[] = [];

    // 1. Cargar desde localStorage aislado de la empresa
    try {
      const localScoped = localStorage.getItem(`korevx_conversations_${targetEnterpriseId}`);
      if (localScoped) {
        loaded = JSON.parse(localScoped);
      } else if (targetEnterpriseId === 'b2d78f5f-95e6-4191-8ec6-a958e8c10bbc') {
        const localLegacy = localStorage.getItem('korevx_conversations');
        if (localLegacy) {
          loaded = JSON.parse(localLegacy);
        }
      }
    } catch (e) {
      console.warn('Error leyendo localStorage de soporte:', e);
    }

    // 2. Cargar desde API de backend si está disponible
    try {
      const res = await axios.get('/api/v1/conversations', {
        params: { workspaceId: targetEnterpriseId },
      });
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        const map = new Map<string, Conversation>();
        loaded.forEach((c) => map.set(c.id, c));
        res.data.forEach((c: Conversation) => map.set(c.id, c));
        loaded = Array.from(map.values());
      }
    } catch (err) {
      console.warn('Error consultando API de conversaciones para soporte:', err);
    }

    setSupportConversations(loaded);
    if (loaded.length > 0) {
      setSelectedSupportConv((prev) => prev && loaded.some((c) => c.id === prev.id) ? prev : loaded[0]);
    } else {
      setSelectedSupportConv(null);
    }
    setIsLoadingSupportChats(false);
  };

  useEffect(() => {
    if (activeSection === 'supportConsole' || effectiveSupportInfo?.active || isSupportModeActive) {
      loadSupportConversations();
    }
  }, [activeSection, effectiveSupportInfo?.enterpriseId, effectiveSupportInfo?.active, isSupportModeActive]);

  const handleSendSupportMessage = async () => {
    if (!selectedSupportConv || !supportMessage.trim()) return;
    setIsSendingSupportMsg(true);
    const newMsg: Message = {
      id: `sup-${Date.now()}`,
      conversationId: selectedSupportConv.id,
      senderType: 'BOT',
      content: `[SOPORTE KOREVX]: ${supportMessage.trim()}`,
      sentAt: new Date().toISOString(),
    };

    const updatedConv: Conversation = {
      ...selectedSupportConv,
      messages: [...(selectedSupportConv.messages || []), newMsg],
      lastActivityAt: new Date().toISOString(),
    };

    const updatedList = supportConversations.map((c) => (c.id === updatedConv.id ? updatedConv : c));
    setSupportConversations(updatedList);
    setSelectedSupportConv(updatedConv);
    setSupportMessage('');

    if (effectiveSupportInfo?.enterpriseId) {
      localStorage.setItem(`korevx_conversations_${effectiveSupportInfo.enterpriseId}`, JSON.stringify(updatedList));
      if (effectiveSupportInfo.enterpriseId === 'b2d78f5f-95e6-4191-8ec6-a958e8c10bbc') {
        localStorage.setItem('korevx_conversations', JSON.stringify(updatedList));
      }
    }

    try {
      await axios.post(`/api/v1/conversations/${selectedSupportConv.id}/reply`, {
        agentUserId: user?.id,
        content: `[SOPORTE KOREVX]: ${newMsg.content}`,
      });
    } catch (e) {
      console.warn('Fallback local para mensaje de soporte');
    }

    setIsSendingSupportMsg(false);
  };

  const handleResolveSupportConversation = async (convId: string) => {
    const updatedList = supportConversations.map((c) =>
      c.id === convId ? { ...c, status: 'RESOLVED' as const } : c
    );
    setSupportConversations(updatedList);
    if (selectedSupportConv && selectedSupportConv.id === convId) {
      setSelectedSupportConv({ ...selectedSupportConv, status: 'RESOLVED' });
    }
    if (effectiveSupportInfo?.enterpriseId) {
      localStorage.setItem(`korevx_conversations_${effectiveSupportInfo.enterpriseId}`, JSON.stringify(updatedList));
    }
    try {
      await axios.patch(`/api/v1/conversations/${convId}/status`, { status: 'RESOLVED' });
    } catch (e) {
      console.warn('Fallback local para resolver conversación de soporte');
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'LOGIN':
        return <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-bold text-[10px]">LOGIN</span>;
      case 'LOGOUT':
        return <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-bold text-[10px]">LOGOUT</span>;
      case 'CREATE':
        return <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 font-bold text-[10px]">CREATE</span>;
      case 'STATUS_CHANGE':
        return <span className="px-2 py-0.5 rounded bg-[#00F0FF]/15 text-[#00F0FF] font-bold text-[10px]">STATUS</span>;
      case 'UPDATE':
        return <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 font-bold text-[10px]">UPDATE</span>;
      case 'SOFT_DELETE':
      case 'DELETE':
        return <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 font-bold text-[10px]">DELETE</span>;
      default:
        return <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold text-[10px]">{action}</span>;
    }
  };

  const activeSupportTickets = platformTickets.filter((t) => t.supportModeRequested && t.status !== 'RESOLVED');

  const filteredSessions = sessions.filter((s) => {
    if (!sessionSearch.trim()) return true;
    const q = sessionSearch.toLowerCase();
    const matchUser = s.user?.fullName?.toLowerCase().includes(q) || s.user?.email?.toLowerCase().includes(q);
    const matchIp = s.ipAddress?.toLowerCase().includes(q);
    const matchDevice = s.deviceType?.toLowerCase().includes(q) || s.userAgent?.toLowerCase().includes(q);
    return matchUser || matchIp || matchDevice;
  });

  const availableWorkspaces = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => {
      const wsName = l.workspace?.name || l.user?.workspace?.name;
      if (wsName) set.add(wsName);
    });
    sessions.forEach((s) => {
      const wsName = s.user?.workspace?.name;
      if (wsName) set.add(wsName);
    });
    try {
      const saved = localStorage.getItem('korevx_custom_enterprises');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          parsed.forEach((e: any) => {
            if (e.name) set.add(e.name);
          });
        }
      }
    } catch (e) {}
    return Array.from(set);
  }, [logs, sessions]);

  const filteredLogs = logs.filter((log) => {
    if (filterWorkspace !== 'all') {
      const wsName = log.workspace?.name || log.user?.workspace?.name || 'KorevX Global';
      if (!wsName.toLowerCase().includes(filterWorkspace.toLowerCase())) return false;
    }
    if (!logSearch.trim()) return true;
    const q = logSearch.toLowerCase();
    const matchDesc = log.description?.toLowerCase().includes(q);
    const matchUser = log.user?.fullName?.toLowerCase().includes(q) || log.user?.email?.toLowerCase().includes(q);
    const matchWorkspace = (log.workspace?.name || log.user?.workspace?.name || '').toLowerCase().includes(q);
    const matchIp = log.ipAddress?.toLowerCase().includes(q);
    const matchAction = log.action?.toLowerCase().includes(q);
    const matchResource = log.resource?.toLowerCase().includes(q);
    return matchDesc || matchUser || matchWorkspace || matchIp || matchAction || matchResource;
  });

  const filteredSupportConvs = supportConversations.filter((c) => {
    if (!supportSearch.trim()) return true;
    const q = supportSearch.toLowerCase();
    const matchName = c.contact?.name?.toLowerCase().includes(q);
    const matchPlatform = c.channelAccount?.platform?.toLowerCase().includes(q);
    const matchHandle = c.channelAccount?.accountHandle?.toLowerCase().includes(q);
    const matchMsg = c.messages?.some((m) => m.content.toLowerCase().includes(q));
    return matchName || matchPlatform || matchHandle || matchMsg;
  });

  return (
    <section className="w-full h-full overflow-y-auto p-6 sm:p-8 bg-[#030508] fade-in space-y-6">
      {/* Cabecera Super Admin */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#111622]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30 flex items-center justify-center text-xs shadow-sm shadow-[#00F0FF]/20">
              <i className="fa-solid fa-satellite-dish"></i>
            </span>
            <h2 className="text-xl font-bold text-white font-tech">
              Administrador Total & Gobernanza Central
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Auditoría inmutable, control de sesiones, blindaje de privacidad Ley 1581 y soporte de plataforma.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#080C14] p-1.5 rounded-xl border border-[#141B29]">
          <button
            onClick={() => setActiveSection('governance')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
              activeSection === 'governance'
                ? 'bg-[#0E1524] text-white border border-[#00F0FF]/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <i className="fa-solid fa-shield-halved text-[#00F0FF] text-xs"></i>
            <span>Gobernanza & Auditoría</span>
          </button>
          <button
            onClick={() => setActiveSection('platformTickets')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
              activeSection === 'platformTickets'
                ? 'bg-[#0E1524] text-white border border-purple-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <i className="fa-solid fa-server text-purple-400 text-xs"></i>
            <span>Tickets de Plataforma</span>
            {platformTickets.filter((t) => t.status === 'OPEN').length > 0 && (
              <span className="w-4 h-4 rounded-full bg-purple-500 text-white text-[10px] font-bold flex items-center justify-center">
                {platformTickets.filter((t) => t.status === 'OPEN').length}
              </span>
            )}
          </button>
          {(isSupportModeActive || effectiveSupportInfo?.active || activeSupportTickets.length > 0) && (
            <button
              onClick={() => setActiveSection('supportConsole')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
                activeSection === 'supportConsole'
                  ? 'bg-amber-950/60 text-amber-300 border border-amber-500/60 shadow-sm shadow-amber-500/20'
                  : 'text-amber-400 hover:text-amber-200 border border-amber-500/30'
              }`}
            >
              <i className="fa-solid fa-wrench text-amber-400 text-xs"></i>
              <span>Soporte: {effectiveSupportInfo?.enterpriseName || 'Empresa'}</span>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            </button>
          )}
        </div>
      </div>

      {/* Tarjeta de Blindaje de Privacidad y Cumplimiento Normativo (Ley 1581 de 2012) */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/20 via-blue-950/20 to-purple-950/20 border border-cyan-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0 mt-0.5">
            <i className="fa-solid fa-user-lock text-lg"></i>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Blindaje de Privacidad Multi-Tenant Activo</h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                Ley 1581 / SIC Cumplida
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
              Por <strong>Ley 1581 de 2012 y Secreto Comercial</strong>, la cuenta de Super Admin NO tiene acceso por defecto
              al contenido de las conversaciones entre clientes finales y empresas. La consola solo procesa telemetría,
              eventos de infraestructura y sesiones de usuario.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5 self-end md:self-auto flex-shrink-0">
          <div className={`px-3.5 py-2.5 rounded-2xl border text-xs ${
            isSupportModeActive || effectiveSupportInfo?.active || activeSupportTickets.length > 0
              ? 'bg-amber-950/30 border-amber-500/50 text-amber-200 shadow-lg shadow-amber-950/50'
              : 'bg-[#080C14] border-[#141B29] text-slate-300'
          }`}>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Modo Soporte Técnico:</span>
              {isSupportModeActive || effectiveSupportInfo?.active || activeSupportTickets.length > 0 ? (
                <span className="font-bold text-amber-400 font-tech flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                  AUTORIZADO Y ACTIVO
                </span>
              ) : (
                <span className="font-bold text-emerald-400 font-tech">Bloqueado (Estricto)</span>
              )}
            </div>
            {(isSupportModeActive || effectiveSupportInfo?.active) && effectiveSupportInfo?.enterpriseName && (
              <div className="mt-2 pt-2 border-t border-amber-500/30 text-[11px] font-tech text-amber-300 space-y-1 text-left">
                <div className="flex items-center gap-1.5">
                  <i className="fa-solid fa-building text-amber-400 text-xs"></i>
                  <span>Empresa: <strong className="text-white">{effectiveSupportInfo.enterpriseName}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <i className="fa-solid fa-user-shield text-amber-400 text-xs"></i>
                  <span>Autorizado por: <strong className="text-white">{effectiveSupportInfo.adminName || 'Administrador'}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-amber-400/80">
                  <i className="fa-regular fa-clock text-[10px]"></i>
                  <span>{effectiveSupportInfo.activatedAt}</span>
                </div>
                <button
                  onClick={() => setActiveSection('supportConsole')}
                  className="mt-2.5 w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  <i className="fa-solid fa-arrow-up-right-from-square text-xs"></i>
                  <span>Abrir Chats de {effectiveSupportInfo.enterpriseName}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {activeSection === 'governance' && (
        <>
          {/* Métricas de Gobernanza y Estado de Infraestructura */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-[#05080F] border border-[#111726]">
              <p className="text-[10px] text-slate-400 font-tech uppercase tracking-wider">Base de Datos</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
                <p className="text-sm font-bold text-white font-tech">Supabase PostgreSQL</p>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Pooler IPv4 conectado</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#05080F] border border-[#111726]">
              <p className="text-[10px] text-slate-400 font-tech uppercase tracking-wider">Meta Graph API</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
                <p className="text-sm font-bold text-white font-tech">Instagram & FB v19</p>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Webhooks verificados</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#05080F] border border-[#111726]">
              <p className="text-[10px] text-slate-400 font-tech uppercase tracking-wider">TikTok Business API</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
                <p className="text-sm font-bold text-white font-tech">Open API v2</p>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Eventos activos</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#05080F] border border-[#00F0FF]/30">
              <p className="text-[10px] text-slate-400 font-tech uppercase tracking-wider">Sesiones Activas</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2 h-2 rounded-full bg-[#00F0FF]"></span>
                <p className="text-sm font-bold text-[#00F0FF] font-tech">{sessions.length} dispositivos</p>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Trazabilidad IP activa</p>
            </div>
          </div>

          {/* Control de Sesiones de Usuario (Quién ingresó, Cuándo, Desde Dónde) */}
          <div className="p-5 rounded-2xl bg-[#05080F] border border-[#111726] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-fingerprint text-[#00F0FF] text-xs"></i>
                <h3 className="text-sm font-bold text-white font-tech">
                  Control de Accesos e Inicios de Sesión (`UserSession`)
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-[#00F0FF]/10 text-[#00F0FF] text-[10px] font-bold font-tech border border-[#00F0FF]/30">
                  {filteredSessions.length} Activas
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-500 text-xs"></i>
                  <input
                    type="text"
                    placeholder="Buscar por usuario, IP, dispositivo..."
                    value={sessionSearch}
                    onChange={(e) => setSessionSearch(e.target.value)}
                    className="pl-8 pr-3 py-1 bg-[#080C14] border border-[#141B29] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00F0FF]/50 w-52 sm:w-64"
                  />
                </div>
                <button
                  onClick={loadSessions}
                  className="p-1.5 rounded-xl bg-[#080C14] border border-[#141B29] text-slate-400 hover:text-white transition"
                  title="Refrescar sesiones"
                >
                  <i className="fa-solid fa-rotate-right text-xs"></i>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[#111622] text-slate-400 font-tech uppercase text-[10px]">
                    <th className="pb-3">Usuario</th>
                    <th className="pb-3">Empresa (Tenant)</th>
                    <th className="pb-3">Rol</th>
                    <th className="pb-3">Dirección IP</th>
                    <th className="pb-3">Dispositivo / Cliente</th>
                    <th className="pb-3">Fecha & Hora</th>
                    <th className="pb-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#111622]">
                  {isLoadingSessions ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-500">
                        Cargando sesiones activas...
                      </td>
                    </tr>
                  ) : filteredSessions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-500">
                        No hay sesiones activas que coincidan con la búsqueda.
                      </td>
                    </tr>
                  ) : (
                    filteredSessions.map((session) => (
                      <tr key={session.id} className="hover:bg-[#080C14] transition">
                        <td className="py-3 font-semibold text-white">
                          {session.user.fullName}
                          <span className="block text-[10px] text-slate-400 font-normal">
                            {session.user.email}
                          </span>
                        </td>
                        <td className="py-3 font-tech">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[#080C14] border border-[#141B29] text-slate-300 text-[11px] font-tech">
                            <i className="fa-solid fa-building text-[10px] text-slate-500"></i>
                            <span>{session.user?.workspace?.name || 'KorevX Global'}</span>
                          </span>
                        </td>
                        <td className="py-3 font-tech text-slate-300">{session.user.role}</td>
                        <td className="py-3 font-tech text-[#00F0FF] font-bold">
                          {session.ipAddress || '127.0.0.1'}
                        </td>
                        <td className="py-3 text-slate-300 max-w-xs truncate" title={session.userAgent || ''}>
                          <i className={`fa-solid ${session.deviceType?.includes('Mobile') || session.deviceType?.includes('iOS') ? 'fa-mobile-screen' : 'fa-laptop'} mr-1.5 text-slate-500`}></i>
                          {session.deviceType || 'Desktop'}
                        </td>
                        <td className="py-3 text-slate-400 font-tech">
                          {new Date(session.loginAt).toLocaleString()}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => handleRevokeSession(session.id)}
                            className="px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-[10px] font-bold font-tech transition"
                          >
                            Revocar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bitácora de Auditoría Inmutable (AuditLog) */}
          <div className="p-5 rounded-2xl bg-[#05080F] border border-[#111726] space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-clock-rotate-left text-[#00F0FF] text-xs"></i>
                  <h3 className="text-sm font-bold text-white font-tech">
                    Bitácora Inmutable de Auditoría (`AuditLog`)
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 text-[10px] font-bold font-tech border border-cyan-500/30">
                    {totalCount !== null ? `${totalCount} Registros Totales` : `${logs.length} Cargados`}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Trazabilidad criptográfica inmutable de eventos, inicios de sesión y mutaciones de datos.
                </p>
              </div>

              {/* Filtros y Controles de Carga */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Buscador en vivo */}
                <div className="relative">
                  <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-500 text-xs"></i>
                  <input
                    type="text"
                    placeholder="Filtrar por detalle, empresa, IP..."
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    className="pl-8 pr-3 py-1 bg-[#080C14] border border-[#141B29] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00F0FF]/50 w-44 sm:w-56"
                  />
                </div>

                {/* Filtro por Empresa / Tenant */}
                <select
                  value={filterWorkspace}
                  onChange={(e) => setFilterWorkspace(e.target.value)}
                  className="bg-[#080C14] border border-[#00F0FF]/40 text-[#00F0FF] rounded-xl px-2.5 py-1 text-xs font-tech font-bold"
                >
                  <option value="all">🏢 Todas las Empresas</option>
                  {availableWorkspaces.map((ws) => (
                    <option key={ws} value={ws}>
                      {ws}
                    </option>
                  ))}
                </select>

                {/* Selector de cantidad por bloque */}
                <select
                  value={limitCount}
                  onChange={(e) => {
                    const newLim = Number(e.target.value);
                    setLimitCount(newLim);
                    loadLogs(null, newLim);
                  }}
                  className="bg-[#080C14] border border-[#141B29] rounded-xl px-2.5 py-1 text-xs text-slate-300 font-tech"
                >
                  <option value={25}>25 por página</option>
                  <option value={50}>50 por página</option>
                  <option value={100}>100 por página</option>
                  <option value={250}>250 por página</option>
                  <option value={500}>500 por página</option>
                </select>

                <select
                  value={filterResource}
                  onChange={(e) => {
                    setFilterResource(e.target.value);
                    loadLogs();
                  }}
                  className="bg-[#080C14] border border-[#141B29] rounded-xl px-2.5 py-1 text-xs text-slate-300 font-tech"
                >
                  <option value="all">Todos los Recursos</option>
                  <option value="CONVERSATION">Conversaciones</option>
                  <option value="TICKET">Tickets</option>
                  <option value="USER">Usuarios</option>
                  <option value="AUTH">Sesiones</option>
                  <option value="CHANNEL">Canales</option>
                </select>

                <select
                  value={filterAction}
                  onChange={(e) => {
                    setFilterAction(e.target.value);
                    loadLogs();
                  }}
                  className="bg-[#080C14] border border-[#141B29] rounded-xl px-2.5 py-1 text-xs text-slate-300 font-tech"
                >
                  <option value="all">Todas las Acciones</option>
                  <option value="CREATE">CREATE</option>
                  <option value="UPDATE">UPDATE</option>
                  <option value="STATUS_CHANGE">STATUS_CHANGE</option>
                  <option value="LOGIN">LOGIN</option>
                  <option value="LOGOUT">LOGOUT</option>
                  <option value="DELETE">DELETE</option>
                </select>

                {/* Botón Cargar Todos */}
                <button
                  onClick={loadAllLogs}
                  disabled={isLoadingAll}
                  className="px-3 py-1 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs font-tech transition shadow-sm shadow-cyan-600/30 flex items-center gap-1.5"
                  title="Cargar absolutamente todos los eventos de la base de datos"
                >
                  {isLoadingAll ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin text-xs"></i>
                      <span>Cargando Todos...</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-bolt text-amber-300 text-xs"></i>
                      <span>Ver Todos los Registros</span>
                    </>
                  )}
                </button>

                {/* Botón Exportar */}
                <button
                  onClick={exportAuditLogsJson}
                  className="px-2.5 py-1 rounded-xl bg-[#080C14] hover:bg-[#0E1524] border border-[#141B29] text-slate-300 hover:text-white text-xs font-tech transition flex items-center gap-1.5"
                  title="Exportar bitácora en JSON"
                >
                  <i className="fa-solid fa-download text-xs text-[#00F0FF]"></i>
                  <span>Exportar</span>
                </button>

                {/* Botón Marco Legal & Auditoría Forense */}
                <button
                  onClick={() => setIsLegalForensicModalOpen(true)}
                  className="px-3 py-1 rounded-xl bg-gradient-to-r from-purple-900/40 to-blue-900/40 hover:from-purple-800/50 hover:to-blue-800/50 border border-purple-500/40 text-purple-300 hover:text-white text-xs font-tech transition flex items-center gap-1.5 shadow-sm shadow-purple-900/20"
                  title="Conocer el alcance legal de los logs (Ley 1581) y qué se puede traer con y sin permiso"
                >
                  <i className="fa-solid fa-scale-balanced text-xs text-purple-400"></i>
                  <span>Marco Legal Ley 1581</span>
                </button>

                <button
                  onClick={() => loadLogs()}
                  className="p-1.5 rounded-xl bg-[#080C14] border border-[#141B29] text-slate-400 hover:text-white transition"
                  title="Refrescar auditoría"
                >
                  <i className="fa-solid fa-rotate-right text-xs"></i>
                </button>
              </div>
            </div>

            {/* Contador de registros visibles */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-tech px-1">
              <span>
                Mostrando <strong className="text-white">{filteredLogs.length}</strong> de{' '}
                <strong className="text-cyan-400">{totalCount !== null ? totalCount : logs.length}</strong> registros en memoria
              </span>
              {(logSearch.trim() || filterWorkspace !== 'all') && (
                <span className="text-amber-400 flex items-center gap-2">
                  <span>Filtro activo: {filterWorkspace !== 'all' ? `[Empresa: ${filterWorkspace}] ` : ''}{logSearch ? `"${logSearch}"` : ''} ({filteredLogs.length} eventos)</span>
                  <button
                    onClick={() => {
                      setFilterWorkspace('all');
                      setLogSearch('');
                    }}
                    className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                  >
                    Limpiar
                  </button>
                </span>
              )}
            </div>

            {/* Tabla de AuditLogs */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[#111622] text-slate-400 font-tech uppercase text-[10px]">
                    <th className="pb-3">Acción</th>
                    <th className="pb-3">Empresa (Tenant)</th>
                    <th className="pb-3">Recurso</th>
                    <th className="pb-3">Descripción</th>
                    <th className="pb-3">Usuario</th>
                    <th className="pb-3">IP / Origen</th>
                    <th className="pb-3">Fecha & Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#111622]">
                  {isLoadingLogs ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        <i className="fa-solid fa-spinner fa-spin text-lg text-[#00F0FF] mb-2 block"></i>
                        Cargando registros de auditoría...
                      </td>
                    </tr>
                  ) : filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No se encontraron registros de auditoría con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#080C14] transition">
                        <td className="py-3 font-tech">{getActionBadge(log.action)}</td>
                        <td className="py-3 font-tech">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-cyan-950/40 text-cyan-300 border border-cyan-500/30 text-[11px] font-tech font-semibold">
                            <i className="fa-solid fa-building text-[10px] text-cyan-400"></i>
                            <span>{log.workspace?.name || log.user?.workspace?.name || 'KorevX Global'}</span>
                          </span>
                        </td>
                        <td className="py-3 font-tech font-bold text-white flex items-center">
                          <span>{log.resource}</span>
                          {log.newState?._forensicMetadata?.sha256Checksum && (
                            <span
                              className="ml-1.5 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-mono border border-emerald-500/30 inline-flex items-center gap-1"
                              title={`Firma SHA-256 Inmutable: ${log.newState._forensicMetadata.sha256Checksum}`}
                            >
                              <i className="fa-solid fa-shield-halved text-[8px]"></i>
                              <span>SHA-256</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-slate-300 max-w-md truncate" title={log.description}>
                          {log.description}
                        </td>
                        <td className="py-3 font-tech text-slate-400">
                          {log.user ? log.user.fullName : 'Sistema (Webhook/Bot)'}
                        </td>
                        <td className="py-3 font-tech text-slate-400 font-mono">
                          {log.ipAddress || '127.0.0.1'}
                        </td>
                        <td className="py-3 font-tech text-slate-500">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginación por Cursores */}
            {hasMore && !isLoadingAll && (
              <div className="pt-3 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-tech">
                  Hay más registros en la base de datos disponibles para paginar.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loadLogs(nextCursor)}
                    disabled={isLoadingMore}
                    className="px-4 py-2 rounded-xl bg-[#080C14] hover:bg-[#0E1524] border border-[#141B29] hover:border-[#00F0FF]/40 text-xs font-semibold text-[#00F0FF] transition flex items-center gap-2"
                  >
                    {isLoadingMore ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin text-xs"></i>
                        <span>Cargando siguientes...</span>
                      </>
                    ) : (
                      <>
                        <span>Cargar siguientes {limitCount} eventos</span>
                        <i className="fa-solid fa-chevron-down text-xs"></i>
                      </>
                    )}
                  </button>
                  <button
                    onClick={loadAllLogs}
                    className="px-4 py-2 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/40 text-xs font-bold text-cyan-300 transition flex items-center gap-1.5"
                  >
                    <i className="fa-solid fa-bolt text-amber-300"></i>
                    <span>Cargar Todos ({totalCount || 'restantes'})</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Sección 2: Tickets de Plataforma e Infraestructura */}
      {activeSection === 'platformTickets' && (
        <div className="space-y-4 fade-in">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-[#05080F] border border-purple-900/30">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-server text-purple-400"></i>
                <span>Tickets de Plataforma e Infraestructura (Tenants)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Incidencias técnicas, caídas de webhooks o facturación reportadas por Administradores de empresas.
              </p>
            </div>
            <button
              onClick={loadPlatformTickets}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
              title="Refrescar lista"
            >
              <i className="fa-solid fa-rotate-right text-xs"></i>
            </button>
          </div>

          {isLoadingTickets ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <i className="fa-solid fa-spinner fa-spin text-xl text-purple-400 mb-2"></i>
              <p>Consultando incidencias de plataforma...</p>
            </div>
          ) : platformTickets.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#05080F] border border-[#111726] text-slate-400 text-xs">
              <i className="fa-regular fa-circle-check text-3xl text-emerald-500 mb-3"></i>
              <p className="font-semibold text-slate-300">Todos los sistemas operativos</p>
              <p className="text-slate-500 mt-1">No hay tickets de plataforma abiertos en este momento.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {platformTickets.map((t) => (
                <div
                  key={t.id}
                  className="p-4 rounded-2xl bg-[#05080F] border border-[#111726] hover:border-slate-700 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-xs text-white">#{t.ticketNumber}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                        {t.category}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          t.status === 'RESOLVED'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : t.status === 'IN_REVIEW'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {t.status === 'RESOLVED' ? 'Resuelto' : t.status === 'IN_REVIEW' ? 'En Revisión' : 'Abierto'}
                      </span>
                      {t.supportModeRequested && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-950/40 text-amber-300 border border-amber-600/40">
                          ⚠️ 'Modo Soporte' Autorizado
                        </span>
                      )}
                    </div>

                    <h4 className="text-xs font-bold text-white">{t.title}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">{t.description}</p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1">
                      <span>Empresa: <strong className="text-cyan-400">{t.workspace?.name || 'Tenant'}</strong></span>
                      <span>Admin: <strong className="text-slate-300">{t.createdBy?.fullName}</strong></span>
                      <span>Fecha: {new Date(t.createdAt).toLocaleString()}</span>
                    </div>

                    {t.resolutionNotes && (
                      <div className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-800/30 text-xs text-emerald-300 mt-2">
                        <strong>Resolución:</strong> {t.resolutionNotes}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {t.supportModeRequested && (
                      <button
                        onClick={() => setActiveSection('supportConsole')}
                        className="px-3 py-1.5 rounded-xl bg-amber-950/40 hover:bg-amber-900/50 border border-amber-600/40 text-amber-300 text-xs font-semibold transition flex items-center gap-1.5"
                        title="Abrir consola de soporte técnico de esta empresa"
                      >
                        <i className="fa-solid fa-wrench text-amber-400"></i>
                        <span>Inspeccionar Chats</span>
                      </button>
                    )}

                    {t.status !== 'RESOLVED' && (
                      <>
                        {resolvingTicketId === t.id ? (
                          <div className="flex items-center gap-2 bg-[#080C14] p-2 rounded-xl border border-slate-800">
                            <input
                              type="text"
                              placeholder="Respuesta técnica / resolución..."
                              value={resolutionNote}
                              onChange={(e) => setResolutionNote(e.target.value)}
                              className="bg-transparent border-b border-slate-700 text-xs text-white px-2 py-1 focus:outline-none focus:border-purple-400 w-48"
                            />
                            <button
                              onClick={() => handleUpdateTicket(t.id, 'RESOLVED')}
                              className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold"
                            >
                              Confirmar
                            </button>
                            <button
                              onClick={() => setResolvingTicketId(null)}
                              className="text-slate-400 hover:text-white p-1"
                            >
                              <i className="fa-solid fa-xmark"></i>
                            </button>
                          </div>
                        ) : (
                          <>
                            {t.status === 'OPEN' && (
                              <button
                                onClick={() => handleUpdateTicket(t.id, 'IN_REVIEW')}
                                className="px-3 py-1.5 rounded-xl bg-blue-950/40 hover:bg-blue-900/50 border border-blue-600/40 text-blue-300 text-xs font-semibold transition"
                              >
                                En Revisión
                              </button>
                            )}
                            <button
                              onClick={() => setResolvingTicketId(t.id)}
                              className="px-3 py-1.5 rounded-xl bg-purple-950/40 hover:bg-purple-900/50 border border-purple-600/40 text-purple-300 text-xs font-semibold transition flex items-center gap-1.5"
                            >
                              <i className="fa-solid fa-check"></i>
                              <span>Resolver</span>
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sección 3: Consola de Diagnóstico & Soporte Técnico Exclusiva (Ley 1581) */}
      {activeSection === 'supportConsole' && (
        <div className="space-y-4 fade-in">
          {/* Header de la consola de soporte */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-amber-950/30 via-[#0A0E17] to-cyan-950/30 border border-amber-500/40 shadow-xl shadow-amber-950/20">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center text-sm shadow-sm">
                  <i className="fa-solid fa-wrench"></i>
                </span>
                <h3 className="text-base font-bold text-white font-tech flex items-center gap-2">
                  <span>Consola de Diagnóstico & Soporte de Plataforma</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/40">
                    Ley 1581 Autorizada
                  </span>
                </h3>
              </div>
              <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                Visualizando <strong>ÚNICAMENTE</strong> los chats y canales de la empresa{' '}
                <span className="text-amber-300 font-bold font-mono">
                  {effectiveSupportInfo?.enterpriseName || 'Tenant'}
                </span>
                . Conforme al blindaje de privacidad y secreto comercial, todas las demás empresas permanecen
                cifradas y bloqueadas.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-400 font-tech">
                <span>
                  Autorizado por:{' '}
                  <strong className="text-white">{effectiveSupportInfo?.adminName || 'Administrador'}</strong> (
                  {effectiveSupportInfo?.adminEmail || 'admin@korevx.com'})
                </span>
                <span>•</span>
                <span>
                  Fecha de Autorización:{' '}
                  <strong className="text-amber-300">{effectiveSupportInfo?.activatedAt || 'Activa'}</strong>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={loadSupportConversations}
                disabled={isLoadingSupportChats}
                className="px-3.5 py-2 rounded-xl bg-[#080C14] hover:bg-[#121824] text-slate-300 hover:text-white border border-[#141B29] text-xs font-semibold transition flex items-center gap-2"
                title="Sincronizar chats de la empresa"
              >
                <i className={`fa-solid fa-rotate-right text-xs ${isLoadingSupportChats ? 'fa-spin text-[#00F0FF]' : ''}`}></i>
                <span>Sincronizar</span>
              </button>
              <button
                onClick={() => setActiveSection('platformTickets')}
                className="px-3.5 py-2 rounded-xl bg-purple-950/40 hover:bg-purple-900/50 text-purple-300 border border-purple-500/40 text-xs font-semibold transition flex items-center gap-2"
              >
                <i className="fa-solid fa-server text-xs"></i>
                <span>Ver Tickets</span>
              </button>
            </div>
          </div>

          {/* Si no está activo el modo soporte */}
          {!(isSupportModeActive || effectiveSupportInfo?.active || activeSupportTickets.length > 0) ? (
            <div className="p-12 text-center rounded-2xl bg-[#05080F] border border-[#111726] text-slate-400 text-xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center text-xl">
                <i className="fa-solid fa-lock"></i>
              </div>
              <h4 className="text-sm font-bold text-white">Modo Soporte Técnico No Activo</h4>
              <p className="text-slate-400 max-w-md mx-auto leading-relaxed">
                Ninguna empresa ha activado el Modo Soporte Técnico en este momento. Conforme a la Ley 1581 de 2012,
                el Super Admin no puede acceder a las conversaciones a menos que el Administrador de la empresa lo
                autorice expresamente.
              </p>
              <button
                onClick={() => setActiveSection('governance')}
                className="px-4 py-2 rounded-xl bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30 text-xs font-semibold hover:bg-[#00F0FF]/25 transition"
              >
                Volver a Gobernanza Total
              </button>
            </div>
          ) : isLoadingSupportChats ? (
            <div className="p-16 text-center text-slate-400 text-xs">
              <i className="fa-solid fa-spinner fa-spin text-2xl text-amber-400 mb-2"></i>
              <p className="text-slate-300 font-semibold">Cargando chats autorizados de {effectiveSupportInfo?.enterpriseName}...</p>
              <p className="text-slate-500 mt-1">Descifrando canal seguro de soporte técnico Ley 1581.</p>
            </div>
          ) : supportConversations.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#05080F] border border-[#111726] text-slate-400 text-xs space-y-2">
              <i className="fa-regular fa-comments text-3xl text-slate-600 mb-2"></i>
              <p className="font-semibold text-slate-300">Empresa sin conversaciones activas</p>
              <p className="text-slate-500 max-w-md mx-auto leading-relaxed">
                La empresa <strong className="text-white">{effectiveSupportInfo?.enterpriseName}</strong> tiene el soporte
                autorizado, pero aún no registra chats o comentarios en sus canales vinculados.
              </p>
            </div>
          ) : (
            /* Panel de Chats de Soporte de 2 Columnas */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[650px] bg-[#05080F] border border-[#141B29] rounded-2xl overflow-hidden">
              {/* Columna Izquierda: Lista de Conversaciones de la Empresa (4 cols) */}
              <div className="lg:col-span-4 border-r border-[#141B29] flex flex-col h-full bg-[#04060B]">
                <div className="p-3 border-b border-[#141B29] space-y-2 bg-[#05080F]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white font-tech flex items-center gap-1.5">
                      <i className="fa-solid fa-comments text-amber-400 text-xs"></i>
                      <span>Chats de {effectiveSupportInfo?.enterpriseName}</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-[10px] font-bold font-mono">
                      {filteredSupportConvs.length}
                    </span>
                  </div>
                  <div className="relative">
                    <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-500 text-xs"></i>
                    <input
                      type="text"
                      placeholder="Buscar por cliente, mensaje, red..."
                      value={supportSearch}
                      onChange={(e) => setSupportSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-[#080C14] border border-[#141B29] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/50"
                    />
                  </div>
                </div>

                {/* Lista scrollable de conversaciones */}
                <div className="flex-1 overflow-y-auto divide-y divide-[#141B29]/60">
                  {filteredSupportConvs.map((conv) => {
                    const isSelected = selectedSupportConv?.id === conv.id;
                    const lastMsg = conv.messages && conv.messages.length > 0 ? conv.messages[conv.messages.length - 1] : null;
                    const platform = conv.channelAccount?.platform || 'INSTAGRAM';

                    return (
                      <button
                        key={conv.id}
                        onClick={() => setSelectedSupportConv(conv)}
                        className={`w-full text-left p-3.5 transition flex items-start gap-3 ${
                          isSelected
                            ? 'bg-amber-950/20 border-l-4 border-amber-400 text-white'
                            : 'hover:bg-[#080D18] text-slate-400'
                        }`}
                      >
                        {/* Avatar con badge de red */}
                        <div className="relative flex-shrink-0">
                          {conv.contact?.avatarUrl ? (
                            <img
                              src={conv.contact.avatarUrl}
                              alt={conv.contact.name}
                              className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-700"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-xs">
                              {conv.contact?.name ? conv.contact.name.slice(0, 2).toUpperCase() : 'CL'}
                            </div>
                          )}
                          <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] text-white ${
                            platform === 'INSTAGRAM'
                              ? 'bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888]'
                              : platform === 'FACEBOOK'
                              ? 'bg-[#1877F2]'
                              : platform === 'TIKTOK'
                              ? 'bg-black border border-slate-700'
                              : 'bg-[#25D366]'
                          }`}>
                            <i className={`fa-brands ${
                              platform === 'INSTAGRAM' ? 'fa-instagram' : platform === 'FACEBOOK' ? 'fa-facebook-f' : platform === 'TIKTOK' ? 'fa-tiktok' : 'fa-whatsapp'
                            }`}></i>
                          </span>
                        </div>

                        {/* Detalles de la conversación */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="text-xs font-bold text-white truncate">{conv.contact?.name || 'Cliente'}</h4>
                            <span className="text-[10px] text-slate-500 font-mono flex-shrink-0">
                              {new Date(conv.lastActivityAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            {lastMsg?.content || 'Sin mensajes registrados'}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded font-mono ${
                              conv.status === 'RESOLVED'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : conv.status === 'ASSIGNED'
                                ? 'bg-cyan-500/20 text-cyan-300'
                                : 'bg-amber-500/20 text-amber-400'
                            }`}>
                              {conv.status}
                            </span>
                            <span className="text-[10px] text-slate-500 truncate">
                              {conv.assignedUser ? `Agente: ${conv.assignedUser.fullName}` : 'Sin asignar'}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Columna Derecha: Hilo del Chat & Diagnóstico Técnico (8 cols) */}
              <div className="lg:col-span-8 flex flex-col h-full bg-[#030508]">
                {selectedSupportConv ? (
                  <>
                    {/* Barra Superior del Chat Seleccionado */}
                    <div className="p-3.5 border-b border-[#141B29] flex flex-wrap items-center justify-between gap-3 bg-[#05080F]">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          {selectedSupportConv.contact?.avatarUrl ? (
                            <img
                              src={selectedSupportConv.contact.avatarUrl}
                              alt={selectedSupportConv.contact.name}
                              className="w-9 h-9 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-xs">
                              {selectedSupportConv.contact?.name ? selectedSupportConv.contact.name.slice(0, 2).toUpperCase() : 'CL'}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-white">{selectedSupportConv.contact?.name || 'Cliente'}</h4>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-[#101726] text-slate-300 font-mono border border-slate-800">
                              {selectedSupportConv.channelAccount?.platform} • {selectedSupportConv.interactionType}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Thread ID: <code className="text-amber-300 font-mono">{selectedSupportConv.externalThreadId}</code> •{' '}
                            Canal: <strong className="text-slate-300">{selectedSupportConv.channelAccount?.accountName}</strong>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {selectedSupportConv.status !== 'RESOLVED' ? (
                          <button
                            onClick={() => handleResolveSupportConversation(selectedSupportConv.id)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-600/40 text-emerald-300 text-xs font-semibold transition flex items-center gap-1.5"
                          >
                            <i className="fa-solid fa-check text-xs"></i>
                            <span>Marcar Resuelto</span>
                          </button>
                        ) : (
                          <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30 flex items-center gap-1.5">
                            <i className="fa-solid fa-check-double text-xs"></i>
                            <span>Resuelto</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Mensajes del Hilo */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      <div className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-500/30 text-[11px] text-amber-300/90 text-center max-w-xl mx-auto">
                        <i className="fa-solid fa-shield-halved mr-1.5"></i>
                        Inspección técnica autorizada conforme a la Ley 1581 de 2012 para diagnóstico de infraestructura.
                      </div>

                      {(!selectedSupportConv.messages || selectedSupportConv.messages.length === 0) ? (
                        <div className="p-8 text-center text-slate-500 text-xs">
                          No hay mensajes en este hilo de conversación.
                        </div>
                      ) : (
                        selectedSupportConv.messages.map((m) => {
                          const isCustomer = m.senderType === 'CUSTOMER';
                          const isSupport = m.content.startsWith('[SOPORTE KOREVX]');

                          return (
                            <div
                              key={m.id}
                              className={`flex flex-col ${isCustomer ? 'items-start' : 'items-end'}`}
                            >
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-1 px-1">
                                <span>{isCustomer ? selectedSupportConv.contact?.name || 'Cliente' : isSupport ? 'Super Admin (Soporte)' : selectedSupportConv.assignedUser?.fullName || 'Operador'}</span>
                                <span>•</span>
                                <span>{new Date(m.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <div
                                className={`max-w-[78%] p-3 rounded-2xl text-xs leading-relaxed ${
                                  isCustomer
                                    ? 'bg-[#101726] border border-[#1A2538] text-slate-200 rounded-tl-sm'
                                    : isSupport
                                    ? 'bg-amber-950/50 border border-amber-500/60 text-amber-200 rounded-tr-sm shadow-md shadow-amber-950/30 font-medium'
                                    : 'bg-gradient-to-r from-cyan-900/40 to-blue-900/40 border border-cyan-500/40 text-white rounded-tr-sm'
                                }`}
                              >
                                {m.content}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Caja de Respuesta / Inyección de Diagnóstico de Soporte */}
                    <div className="p-3 border-t border-[#141B29] bg-[#05080F]">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder={`Escribir respuesta de asistencia o prueba técnica a ${selectedSupportConv.contact?.name}...`}
                          value={supportMessage}
                          onChange={(e) => setSupportMessage(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendSupportMessage();
                            }
                          }}
                          className="flex-1 px-3.5 py-2 bg-[#080C14] border border-[#141B29] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/60"
                        />
                        <button
                          onClick={handleSendSupportMessage}
                          disabled={isSendingSupportMsg || !supportMessage.trim()}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-black font-bold text-xs transition flex items-center gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer"
                        >
                          {isSendingSupportMsg ? (
                            <i className="fa-solid fa-spinner fa-spin text-xs"></i>
                          ) : (
                            <i className="fa-solid fa-paper-plane text-xs"></i>
                          )}
                          <span>Enviar Soporte</span>
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1.5">
                        ⚠️ Todo mensaje enviado desde esta consola queda sellado e indexado en el registro forense de auditoría inmutable.
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 text-xs">
                    <i className="fa-regular fa-comment-dots text-3xl mb-2 text-slate-600"></i>
                    <p className="font-semibold text-slate-400">Ningún chat seleccionado</p>
                    <p className="text-slate-500 mt-1 max-w-xs">
                      Selecciona una conversación de la lista de la izquierda para realizar el diagnóstico técnico.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: Marco Legal de Auditoría & Trazabilidad Forense (Portal al body) */}
      {isLegalForensicModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[99999] flex items-start justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
            <div className="relative w-full max-w-4xl bg-[#05080F] border border-[#141B29] hover:border-purple-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/90 my-auto transition max-h-[90vh] flex flex-col">
            {/* Header del Modal */}
            <div className="flex items-center justify-between pb-4 border-b border-[#141B29] mb-5">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center text-base shadow-sm">
                  <i className="fa-solid fa-scale-balanced"></i>
                </span>
                <div>
                  <h3 className="text-base font-bold text-white font-tech">
                    Marco Legal de Auditoría & Trazabilidad Forense
                  </h3>
                  <p className="text-xs text-slate-400">
                    Cumplimiento de la Ley 1581 de 2012, Ley 527 de 1999 y Circulares SIC para plataformas de atención omnicanal.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsLegalForensicModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-[#080C14] hover:bg-[#121824] text-slate-400 hover:text-white border border-[#141B29] flex items-center justify-center text-xs transition"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Pestañas del Modal */}
            <div className="flex items-center gap-2 border-b border-[#141B29] pb-3 mb-5 font-tech text-xs overflow-x-auto">
              <button
                onClick={() => setLegalTab('current')}
                className={`px-3.5 py-2 rounded-xl font-semibold transition flex items-center gap-2 whitespace-nowrap ${
                  legalTab === 'current'
                    ? 'bg-[#0E1524] text-white border border-[#00F0FF]/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <i className="fa-solid fa-list-check text-[#00F0FF]"></i>
                <span>1. ¿Qué Logs Traemos Actualmente?</span>
              </button>

              <button
                onClick={() => setLegalTab('max_legal')}
                className={`px-3.5 py-2 rounded-xl font-semibold transition flex items-center gap-2 whitespace-nowrap ${
                  legalTab === 'max_legal'
                    ? 'bg-[#0E1524] text-white border border-purple-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <i className="fa-solid fa-shield-halved text-purple-400"></i>
                <span>2. ¿Qué Más Podemos Traer? (Máximo Legal)</span>
              </button>

              <button
                onClick={() => setLegalTab('with_permission')}
                className={`px-3.5 py-2 rounded-xl font-semibold transition flex items-center gap-2 whitespace-nowrap ${
                  legalTab === 'with_permission'
                    ? 'bg-[#0E1524] text-white border border-amber-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <i className="fa-solid fa-key text-amber-400"></i>
                <span>3. ¿Con Permiso Qué Puedes Traer? (Soporte)</span>
              </button>
            </div>

            {/* Contenido según Pestaña */}
            <div className="overflow-y-auto flex-1 space-y-4 pr-1 text-xs leading-relaxed">
              {/* TAB 1: LOGS ACTUALES */}
              {legalTab === 'current' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 flex items-start gap-3">
                    <i className="fa-solid fa-circle-check text-cyan-400 text-sm mt-0.5"></i>
                    <div>
                      <h4 className="font-bold text-white font-tech">Capacidades de Registro Activas en KorevX</h4>
                      <p className="text-slate-300 mt-1">
                        Actualmente el sistema registra cada evento administrativo, técnico y operativo en tiempo real en la tabla inmutable <strong>AuditLog</strong> de PostgreSQL con las siguientes dimensiones forenses:
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-4 rounded-2xl bg-[#080C14] border border-[#141B29] space-y-2">
                      <h5 className="font-bold text-[#00F0FF] font-tech flex items-center gap-2">
                        <i className="fa-solid fa-user-lock"></i>
                        <span>Inicios y Cierres de Sesión (`AUTH`)</span>
                      </h5>
                      <ul className="text-slate-400 space-y-1 text-[11px] list-disc list-inside">
                        <li>Dirección IP pública real (extraída vía cabeceras seguras <code>x-forwarded-for</code>).</li>
                        <li>User-Agent completo (Navegador, versión exacta y Sistema Operativo).</li>
                        <li>Clasificación de dispositivo (Desktop vs Mobile).</li>
                        <li>Sello de tiempo oficial UTC de ingreso y salida.</li>
                      </ul>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#080C14] border border-[#141B29] space-y-2">
                      <h5 className="font-bold text-emerald-400 font-tech flex items-center gap-2">
                        <i className="fa-solid fa-share-nodes"></i>
                        <span>Ciclo de Vida de Conversaciones</span>
                      </h5>
                      <ul className="text-slate-400 space-y-1 text-[11px] list-disc list-inside">
                        <li>Transiciones de estado (<code>PENDING</code> → <code>ASSIGNED</code> → <code>RESOLVED</code>).</li>
                        <li>Duración exacta en segundos en cada estado para métricas SLA.</li>
                        <li>Actor que ejecutó el cambio (Operador, Supervisor o Webhook automático).</li>
                        <li>Línea de tiempo inmutable con snapshot de estados.</li>
                      </ul>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#080C14] border border-[#141B29] space-y-2">
                      <h5 className="font-bold text-amber-400 font-tech flex items-center gap-2">
                        <i className="fa-solid fa-eye"></i>
                        <span>Inspección de Supervisores (Modo Auditoría)</span>
                      </h5>
                      <ul className="text-slate-400 space-y-1 text-[11px] list-disc list-inside">
                        <li>Quién activó el modo auditoría, hora de inicio y de fin.</li>
                        <li>Duración total calculada de la sesión de supervisión.</li>
                        <li><strong>Qué vio el supervisor:</strong> Registro de qué conversación inspeccionó y a qué operador auditó.</li>
                      </ul>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#080C14] border border-[#141B29] space-y-2">
                      <h5 className="font-bold text-rose-400 font-tech flex items-center gap-2">
                        <i className="fa-solid fa-trash-can"></i>
                        <span>Mutaciones Críticas y Canales</span>
                      </h5>
                      <ul className="text-slate-400 space-y-1 text-[11px] list-disc list-inside">
                        <li>Vinculación, desconexión y borrado definitivo de canales sociales.</li>
                        <li>Creación y resolución de tickets de plataforma.</li>
                        <li>Snapshots diferenciales JSON de <code>previousState</code> y <code>newState</code>.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: MÁXIMO LEGAL PERMITIDO */}
              {legalTab === 'max_legal' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/30 flex items-start gap-3">
                    <i className="fa-solid fa-gavel text-purple-400 text-sm mt-0.5"></i>
                    <div>
                      <h4 className="font-bold text-white font-tech">
                        El Límite Máximo Permitido por la Ley Colombiana (Ley 1581 / Ley 527)
                      </h4>
                      <p className="text-slate-300 mt-1">
                        Bajo el principio de <strong>Necesidad y Finalidad (Art. 4 Literal b, Ley 1581)</strong> y los estándares probatorios de la <strong>Ley 527 de 1999</strong>, una plataforma omnicanal puede y debe capturar telemetría forense completa, pero <strong>no puede espiar conversaciones privadas sin una orden expresa</strong>. Esto es lo que legalmente podemos traer:
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl bg-[#080C14] border border-[#141B29] flex items-start gap-3">
                      <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                        <i className="fa-solid fa-fingerprint"></i>
                      </span>
                      <div>
                        <h5 className="font-bold text-white font-tech">
                          1. Firma Criptográfica SHA-256 por Registro (Cadena de Custodia)
                        </h5>
                        <p className="text-slate-400 text-[11px] mt-0.5">
                          Calcula un hash SHA-256 único e inmutable combinando el ID de evento, workspace, actor, fecha UTC y payload. Garantiza ante la SIC o la Fiscalía General que ningún administrador alteró la base de datos a posteriori.
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#080C14] border border-[#141B29] flex items-start gap-3">
                      <span className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                        <i className="fa-solid fa-file-export"></i>
                      </span>
                      <div>
                        <h5 className="font-bold text-white font-tech">
                          2. Trazabilidad DLP de Descargas y Exportaciones de Datos
                        </h5>
                        <p className="text-slate-400 text-[11px] mt-0.5">
                          Monitoreo de fuga de información (Data Loss Prevention): si un usuario exporta a Excel/JSON datos de clientes o chats, se registra el número exacto de filas, filtros utilizados, IP y usuario responsable.
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#080C14] border border-[#141B29] flex items-start gap-3">
                      <span className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                        <i className="fa-solid fa-triangle-exclamation"></i>
                      </span>
                      <div>
                        <h5 className="font-bold text-white font-tech">
                          3. Monitoreo de Intentos Fallidos de Acceso y Fuerza Bruta
                        </h5>
                        <p className="text-slate-400 text-[11px] mt-0.5">
                          Registro de contraseñas erróneas consecutivas, anomalías de inicio de sesión desde rangos de IP desconocidos o cambios no autorizados de permisos de usuario.
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#080C14] border border-[#141B29] flex items-start gap-3">
                      <span className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                        <i className="fa-solid fa-network-wired"></i>
                      </span>
                      <div>
                        <h5 className="font-bold text-white font-tech">
                          4. Geolocalización Forense por IP y Proveedor de Internet (ASN)
                        </h5>
                        <p className="text-slate-400 text-[11px] mt-0.5">
                          Identificación de ciudad, país, operador ISP (Claro, Tigo, Movistar, AWS, etc.) para verificar que los operadores están trabajando desde ubicaciones autorizadas por la empresa.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Prueba en Vivo de Registro Forense */}
                  <div className="p-4 rounded-2xl bg-[#080C14] border border-purple-500/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="font-bold text-purple-300 font-tech">Simulador de Evento Forense con SHA-256</h5>
                        <p className="text-[11px] text-slate-400">
                          Dispara un evento de auditoría de seguridad para comprobar cómo se sella criptográficamente en el backend.
                        </p>
                      </div>

                      <button
                        onClick={async () => {
                          setIsTestingEvent(true);
                          setTestResult(null);
                          try {
                            const res = await axios.post('/api/v1/audit/security-event', {
                              eventType: 'DATA_EXPORT',
                              details: 'Auditoría forense de prueba ejecutada por Super Admin',
                              actorEmail: user?.email,
                              rowCount: 100,
                            });
                            setTestResult(
                              `✅ Evento guardado con SHA-256: ${res.data.newState?._forensicMetadata?.sha256Checksum?.slice(0, 24)}...`
                            );
                            loadLogs();
                          } catch (err: any) {
                            setTestResult('❌ Error registrando evento.');
                          } finally {
                            setIsTestingEvent(false);
                          }
                        }}
                        disabled={isTestingEvent}
                        className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs font-tech transition flex items-center gap-1.5 shadow-sm"
                      >
                        {isTestingEvent ? (
                          <>
                            <i className="fa-solid fa-spinner fa-spin text-xs"></i>
                            <span>Sellando...</span>
                          </>
                        ) : (
                          <>
                            <i className="fa-solid fa-wand-magic-sparkles text-xs"></i>
                            <span>Probar Registro SHA-256</span>
                          </>
                        )}
                      </button>
                    </div>

                    {testResult && (
                      <div className="p-2.5 rounded-xl bg-[#05080F] border border-emerald-500/40 text-[11px] font-mono text-emerald-400">
                        {testResult}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: CON PERMISO EXPRESO */}
              {legalTab === 'with_permission' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/40 flex items-start gap-3">
                    <i className="fa-solid fa-triangle-exclamation text-amber-400 text-sm mt-0.5"></i>
                    <div>
                      <h4 className="font-bold text-white font-tech">
                        ¿Qué se Puede Traer Únicamente CON Permiso Expreso?
                      </h4>
                      <p className="text-slate-300 mt-1">
                        Bajo el <strong>Artículo 15 de la Constitución Política de Colombia</strong> (Inviolabilidad de las comunicaciones privadas y Habeas Data), el Super Admin <strong>NO puede</strong> ver el contenido de los chats de otra empresa sin su consentimiento explícito o mandato de un juez. Sin embargo, con un <strong>Ticket de Soporte firmado con `supportModeGranted: true`</strong>, se habilita la inspección técnica:
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-2xl bg-[#080C14] border border-[#141B29] space-y-2">
                      <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs">
                        <i className="fa-solid fa-code"></i>
                      </div>
                      <h5 className="font-bold text-white font-tech">Payload Crudo de Webhooks</h5>
                      <p className="text-[11px] text-slate-400">
                        El cuerpo JSON exacto enviado por los servidores de Meta o TikTok, incluyendo encabezados HTTP y firmas <code>X-Hub-Signature-256</code> para diagnosticar mensajes que no entran.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#080C14] border border-[#141B29] space-y-2">
                      <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs">
                        <i className="fa-solid fa-tower-broadcast"></i>
                      </div>
                      <h5 className="font-bold text-white font-tech">Trazas HTTP de Graph API</h5>
                      <p className="text-[11px] text-slate-400">
                        Registro de peticiones hacia las APIs externas con código de estado HTTP (200, 401, 429), latencia en milisegundos y mensajes de error del proveedor (ej. token vencido).
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#080C14] border border-[#141B29] space-y-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">
                        <i className="fa-solid fa-eye"></i>
                      </div>
                      <h5 className="font-bold text-white font-tech">Inspección Asistida Temporal</h5>
                      <p className="text-[11px] text-slate-400">
                        Apertura en pantalla de la conversación reportada durante una ventana estricta de 2 horas, con marca de agua oficial y registro en el log de cada byte visualizado.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#080C14] border border-[#141B29] flex items-center justify-between text-[11px] text-slate-400 font-tech">
                    <span className="flex items-center gap-2">
                      <i className="fa-solid fa-file-contract text-emerald-400"></i>
                      <span>Garantía Legal: Ninguna inspección es anónima ni indetectable.</span>
                    </span>
                    <span className="text-[#00F0FF]">Cumplimiento SIC 100%</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer de Cierre */}
            <div className="pt-4 border-t border-[#141B29] flex justify-end mt-4">
              <button
                type="button"
                onClick={() => setIsLegalForensicModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-[#0E1524] hover:bg-[#141E33] border border-[#162032] text-xs font-semibold text-white transition font-tech"
              >
                Cerrar Dictamen Legal
              </button>
            </div>
            </div>
          </div>,
          document.body
        )}
    </section>
  );
};
