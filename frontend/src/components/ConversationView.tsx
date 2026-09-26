import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { Conversation, PlatformType, InteractionType, QuickResponse } from '../types';
import { ConversationTimeline } from './crm/ConversationTimeline';
import { CreateTicketModal } from './tickets/CreateTicketModal';
import { useAuth } from '../context/AuthContext';

interface ConversationViewProps {
  conversation: Conversation;
  onBack: () => void;
  onSendMessage: (text: string) => Promise<void>;
  onMarkResolved: () => Promise<void>;
  onStatusChange?: (newStatus: string) => void;
  onAssignUser?: (userId: string) => Promise<void>;
  isSupportModeActive?: boolean;
  isAuditModeActive?: boolean;
  onToggleAuditMode?: (enabled: boolean) => void;
  availableAgents?: Array<{ id: string; name: string; role?: string }>;
  auditRequest?: {
    status: 'NONE' | 'REQUESTED' | 'ACCEPTED' | 'REJECTED';
    requestedBy?: string;
    requestedByName?: string;
  };
  onRequestAudit?: () => void;
  onRespondAudit?: (accepted: boolean) => void;
  onLogInspection?: (details: string) => void;
  onShareWithAdmin?: () => void;
  onEndCollaboration?: () => void;
  quickTemplates?: QuickResponse[];
}

export const ConversationView: React.FC<ConversationViewProps> = ({
  conversation,
  onBack,
  onSendMessage,
  onMarkResolved,
  onStatusChange,
  onAssignUser,
  isSupportModeActive = false,
  isAuditModeActive = false,
  onToggleAuditMode,
  availableAgents = [],
  auditRequest,
  onRequestAudit,
  onRespondAudit,
  onLogInspection,
  onShareWithAdmin,
  onEndCollaboration,
  quickTemplates = [],
}) => {
  const { user } = useAuth();
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isCrmOpen, setIsCrmOpen] = useState(false);
  const [crmTab, setCrmTab] = useState<'details' | 'timeline'>('details');
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(conversation?.status || 'PENDING');
  const [selectedQuickIndex, setSelectedQuickIndex] = useState<number>(0);
  const [isQuickDrawerOpen, setIsQuickDrawerOpen] = useState<boolean>(false);

  // Protecciones de datos de la conversación
  const contactName = conversation?.contact?.name || 'Cliente';
  const contactFirstName = contactName.split(' ')[0] || 'Cliente';
  const contactAvatar =
    conversation?.contact?.avatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(contactName)}&background=1877F2&color=fff&bold=true`;
  const platform = conversation?.channelAccount?.platform || 'INSTAGRAM';
  const accountName = conversation?.channelAccount?.accountName || 'Canal Oficial';
  const messages = conversation?.messages || [];

  const [isEditingContact, setIsEditingContact] = useState(false);
  const [editedContactName, setEditedContactName] = useState(conversation?.contact?.name || 'Cliente');

  React.useEffect(() => {
    setEditedContactName(conversation?.contact?.name || 'Cliente');
    setIsEditingContact(false);
  }, [conversation?.id, conversation?.contact?.name]);

  const handleSaveContactName = async () => {
    const trimmed = editedContactName.trim();
    if (!trimmed || trimmed === contactName) {
      setIsEditingContact(false);
      return;
    }
    try {
      await axios.patch(`/api/v1/conversations/${conversation.id}/contact`, {
        name: trimmed,
      });
      if (conversation.contact) {
        conversation.contact.name = trimmed;
      }
      setIsEditingContact(false);
    } catch (err) {
      console.error('Error actualizando nombre de contacto:', err);
      setIsEditingContact(false);
    }
  };

  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [channelTokenInput, setChannelTokenInput] = useState('');
  const [isSavingToken, setIsSavingToken] = useState(false);

  const handleSaveChannelToken = async () => {
    if (!channelTokenInput.trim() || !conversation?.channelAccountId) return;
    setIsSavingToken(true);
    try {
      await axios.patch(`/api/v1/channels/${conversation.channelAccountId}/token`, {
        accessToken: channelTokenInput.trim(),
      });
      if (conversation.channelAccount) {
        conversation.channelAccount.accessToken = channelTokenInput.trim();
      }
      alert('¡Token de Meta guardado exitosamente! Ahora las respuestas se enviarán directamente a Facebook Messenger.');
      setIsTokenModalOpen(false);
      setChannelTokenInput('');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error guardando el token de Meta');
    } finally {
      setIsSavingToken(false);
    }
  };

  // Verificar si ya existe al menos un mensaje previo de un agente
  const hasAgentReplied = messages.some((m) => m.senderType === 'AGENT');
  const isDirectMessage = conversation?.interactionType === 'DIRECT_MESSAGE';

  // Texto obligatorio de la Ley 1581 de 2012
  const mandatoryLey1581Text = `Hola ${contactFirstName}, gracias por comunicarte con nosotros. Al continuar conversando con nosotros, confirmas que conoces y aceptas nuestra Política de Tratamiento de Datos Personales (Ley 1581 de 2012) en https://korevx.com/privacidad. ¿En qué te podemos ayudar hoy?`;

  // Variables de gobernanza y roles
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isAdmin = user?.role === 'ADMIN';
  const isAgent = user?.role === 'AGENT';

  // Solo el Super Admin tiene blindaje de secreto comercial por defecto (Ley 1581) a menos que esté en soporte técnico
  const isSuperAdminBlocked = isSuperAdmin && !isSupportModeActive;

  // Regla para Administrador/Supervisor:
  // Si el caso NO está asignado a nadie (sin operador), el supervisor puede verlo libre e independientemente.
  // Si está asignado a un operador, se reserva por Ley 1581 a menos que se autorice la auditoría interna,
  // el operador lo comparta (COLLABORATING), se lo asigne a sí mismo o active soporte técnico.
  const isUnassigned = !conversation?.assignedUserId || conversation?.status === 'PENDING';
  const isAuditApproved = auditRequest?.status === 'ACCEPTED';
  const isSharedWithAdmin = currentStatus === 'COLLABORATING' || conversation?.status === 'COLLABORATING';
  const isAssignedToThisUser = conversation?.assignedUserId === user?.id;
  const isAdminBlocked = isAdmin && !isUnassigned && !isSharedWithAdmin && !isAssignedToThisUser && !isSupportModeActive && !isAuditApproved && !isAuditModeActive;

  // Pre-llenar obligatoriamente el aviso legal en el primer contacto por DM
  React.useEffect(() => {
    if (!hasAgentReplied && isDirectMessage) {
      setInputText(mandatoryLey1581Text);
    } else {
      setInputText('');
    }
    setCurrentStatus(conversation?.status || 'PENDING');
  }, [conversation?.id]);

  // Registrar acceso de auditoría si el supervisor inspecciona un caso asignado a un operador
  React.useEffect(() => {
    if (
      user?.role !== 'AGENT' &&
      conversation?.assignedUserId &&
      conversation.assignedUserId !== user?.id &&
      (isAuditModeActive || isAuditApproved) &&
      onLogInspection
    ) {
      const assignedName = conversation.assignedUser?.fullName || 'Operador Asignado';
      onLogInspection(
        `Inspeccionó la conversación de ${contactName} (atendida por el operador ${assignedName}) en modo auditoría. Visualizó historial y mensajes.`
      );
    }
  }, [conversation?.id, isAuditModeActive, isAuditApproved]);

  // Determinar firma oficial obligatoria según el perfil
  const getCargoLabel = () => {
    if (isSuperAdmin) return 'Super Admin';
    if (isAdmin) return 'Supervisora';
    return 'Agente';
  };
  const shortName = user?.fullName ? user.fullName.split(' ')[0] : 'KorevX';
  const officialSignature = `[${shortName} - ${getCargoLabel()}]`;

  // Detección de atajo /comando mientras se escribe en el campo de texto
  const slashMatch = inputText.match(/(?:^|\s)\/([a-zA-Z0-9_-]*)$/);
  const isTypingSlash = Boolean(slashMatch);
  const slashQuery = slashMatch ? slashMatch[1].toLowerCase() : '';

  const matchedTemplates = isTypingSlash && quickTemplates
    ? quickTemplates.filter(
        (t) =>
          t.shortcut.toLowerCase().includes(slashQuery) ||
          t.title.toLowerCase().includes(slashQuery) ||
          t.content.toLowerCase().includes(slashQuery)
      )
    : [];

  const insertQuickTemplate = (tmpl: QuickResponse) => {
    if (isTypingSlash) {
      const replaced = inputText.replace(/(?:^|\s)\/([a-zA-Z0-9_-]*)$/, (match) => {
        const prefix = match.startsWith(' ') ? ' ' : '';
        return `${prefix}${tmpl.content} `;
      });
      setInputText(replaced);
    } else {
      setInputText((prev) => (prev.trim() ? `${prev.trim()}\n${tmpl.content}` : tmpl.content));
    }
    setIsQuickDrawerOpen(false);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;

    try {
      setIsSending(true);
      let content = inputText.trim();

      // Expandir automáticamente cualquier atajo rápido (/despedida, /saludo, /precios, /demo...)
      if (quickTemplates && quickTemplates.length > 0) {
        for (const tmpl of quickTemplates) {
          const escapedShortcut = tmpl.shortcut.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`(^|\\s)${escapedShortcut}(?=\\s|$)`, 'gi');
          content = content.replace(regex, `$1${tmpl.content}`);
        }
      }

      // Si es el primer contacto por DM, garantizar obligatoriamente la cláusula de Ley 1581
      if (!hasAgentReplied && isDirectMessage) {
        const hasLegalClause = content.includes('1581') || content.includes('privacidad') || content.includes('Tratamiento de Datos');
        if (!hasLegalClause) {
          content = `${mandatoryLey1581Text}\n\n${content}`;
        }
      }

      // Aplicar formato de firma transparente [Nombre - Cargo] Mensaje si no la tiene
      const textToSend = content.startsWith('[')
        ? content
        : `${officialSignature} ${content}`;

      await onSendMessage(textToSend);
      setInputText('');
      setIsQuickDrawerOpen(false);
    } finally {
      setIsSending(false);
    }
  };

  const handleShareWithAdmin = async () => {
    // Bloquear colaboración si no está asignado
    if (!conversation?.id || !conversation.assignedUserId) return;
    try {
      setIsSharing(true);
      setCurrentStatus('COLLABORATING');
      if (onShareWithAdmin) {
        onShareWithAdmin();
      } else if (onStatusChange) {
        onStatusChange('COLLABORATING');
      }
      try {
        await axios.patch(`/api/v1/conversations/${conversation.id}/status`, {
          status: 'COLLABORATING',
          performedById: user?.id,
        });
      } catch (e) {
        // Fallback local
      }
    } catch (err) {
      console.warn('Error al compartir conversación con admin:', err);
    } finally {
      setIsSharing(false);
    }
  };

  const handleEndCollaboration = async () => {
    if (!conversation?.id) return;
    try {
      setIsSharing(true);
      const nextStatus = conversation.assignedUserId ? 'ASSIGNED' : 'PENDING';
      setCurrentStatus(nextStatus);
      if (onEndCollaboration) {
        onEndCollaboration();
      } else if (onStatusChange) {
        onStatusChange(nextStatus);
      }
      try {
        await axios.patch(`/api/v1/conversations/${conversation.id}/status`, {
          status: nextStatus,
          assignedUserId: conversation.assignedUserId,
          performedById: user?.id,
        });
      } catch (e) {
        // Fallback local
      }
    } catch (err) {
      console.warn('Error al finalizar colaboración:', err);
    } finally {
      setIsSharing(false);
    }
  };

  // Inserción / Restauración rápida de aviso legal Ley 1581
  const restoreMacroLey1581 = () => {
    setInputText(mandatoryLey1581Text);
  };

  const insertMacroDerivarDM = () => {
    const text = `¡Hola ${contactFirstName}! Con gusto te ayudamos. Por tu seguridad y para proteger tus datos personales (Ley 1581), por favor envíanos un mensaje directo (DM) con tu número de pedido o consulta.`;
    setInputText(text);
  };

  const getPlatformIcon = (plt: PlatformType) => {
    switch (plt) {
      case 'INSTAGRAM':
        return (
          <span className="w-5 h-5 rounded-full flex items-center justify-center bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-[10px] text-white">
            <i className="fa-brands fa-instagram"></i>
          </span>
        );
      case 'FACEBOOK':
        return (
          <span className="w-5 h-5 rounded-full flex items-center justify-center bg-[#1877F2] text-[10px] text-white">
            <i className="fa-brands fa-facebook-f"></i>
          </span>
        );
      case 'TIKTOK':
        return (
          <span className="w-5 h-5 rounded-full bg-black border border-slate-700/80 flex items-center justify-center">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none">
              <path
                d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-2.89 2.89 2.896 2.896 0 0 1-2.89-2.89 2.896 2.896 0 0 1 2.89-2.89c.31 0 .607.05.885.14V9.417a6.34 6.34 0 0 0-.885-.062 6.34 6.34 0 0 0-6.335 6.34 6.34 0 0 0 6.335 6.34 6.34 0 0 0 6.335-6.34V8.528c1.3.93 2.88 1.48 4.59 1.51V6.6c-.575-.02-1.127-.19-1.615-.494v.58z"
                fill="#00F2FE"
                transform="translate(-0.6, -0.6)"
              />
              <path
                d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-2.89 2.89 2.896 2.896 0 0 1-2.89-2.89 2.896 2.896 0 0 1 2.89-2.89c.31 0 .607.05.885.14V9.417a6.34 6.34 0 0 0-.885-.062 6.34 6.34 0 0 0-6.335 6.34 6.34 0 0 0 6.335 6.34 6.34 0 0 0 6.335-6.34V8.528c1.3.93 2.88 1.48 4.59 1.51V6.6c-.575-.02-1.127-.19-1.615-.494v.58z"
                fill="#FE2C55"
                transform="translate(0.6, 0.6)"
              />
              <path
                d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-2.89 2.89 2.896 2.896 0 0 1 2.89-2.89c.31 0 .607.05.885.14V9.417a6.34 6.34 0 0 0-.885-.062 6.34 6.34 0 0 0-6.335 6.34 6.34 0 0 0 6.335 6.34 6.34 0 0 0 6.335-6.34V8.528c1.3.93 2.88 1.48 4.59 1.51V6.6c-.575-.02-1.127-.19-1.615-.494v.58z"
                fill="#FFFFFF"
              />
            </svg>
          </span>
        );
      default:
        return null;
    }
  };

  if (!conversation) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#030508] text-slate-400 text-xs p-6">
        <p>No se ha podido cargar la conversación.</p>
        <button
          onClick={onBack}
          className="mt-3 px-4 py-2 bg-[#080C14] hover:bg-[#0E1524] border border-[#141B29] rounded-xl text-white font-semibold"
        >
          Volver a la bandeja
        </button>
      </div>
    );
  }

  return (
    <section className="w-full h-full flex overflow-hidden bg-[#030508] fade-in">
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Cabecera de la Conversación */}
        <div className="h-16 px-4 sm:px-6 border-b border-[#111622] bg-[#05080F] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <button
              onClick={onBack}
              className="px-3 py-1.5 rounded-xl bg-[#080C14] hover:bg-[#0E1422] border border-[#141B29] hover:border-[#00F0FF]/40 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-2 transition shadow-sm flex-shrink-0"
              title="Volver a la bandeja"
            >
              <i className="fa-solid fa-arrow-left text-xs text-[#00F0FF]"></i>
              <span className="hidden sm:inline">Volver</span>
            </button>

            <div className="h-6 w-px bg-[#141B29] hidden sm:block"></div>

            <div className="flex items-center gap-3 min-w-0">
              <div className="relative flex-shrink-0">
                <img
                  src={contactAvatar}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover ring-1 ring-[#1A2332]"
                  alt="avatar"
                />
                <div className="absolute -bottom-1 -right-1 ring-2 ring-[#030508] rounded-full">
                  {getPlatformIcon(platform)}
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {isEditingContact ? (
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editedContactName}
                        onChange={(e) => setEditedContactName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveContactName();
                          if (e.key === 'Escape') setIsEditingContact(false);
                        }}
                        autoFocus
                        className="bg-[#080C14] border border-[#00F0FF]/60 rounded-lg px-2 py-0.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#00F0FF]"
                      />
                      <button
                        type="button"
                        onClick={handleSaveContactName}
                        className="p-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-[10px]"
                        title="Guardar nombre"
                      >
                        <i className="fa-solid fa-check"></i>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingContact(false)}
                        className="p-1 rounded bg-slate-800 text-slate-400 hover:bg-slate-700 text-[10px]"
                        title="Cancelar"
                      >
                        <i className="fa-solid fa-xmark"></i>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs sm:text-sm font-bold text-white truncate font-tech">
                        {contactName}
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          setEditedContactName(contactName);
                          setIsEditingContact(true);
                        }}
                        className="text-slate-400 hover:text-[#00F0FF] text-[11px] p-0.5 transition"
                        title="Editar nombre del cliente"
                      >
                        <i className="fa-solid fa-pencil"></i>
                      </button>
                    </div>
                  )}

                  {conversation.interactionType === 'DIRECT_MESSAGE' ? (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-[#10B981] font-semibold border border-emerald-500/30">
                      DM
                    </span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30">
                      Post Comment
                    </span>
                  )}

                  {/* Badge de Asignación explícita y botón Tomar Caso */}
                  {conversation.assignedUserId === user?.id ? (
                    <span className="text-[10px] px-2 py-0.2 rounded-full bg-cyan-500/15 text-[#00F0FF] font-semibold border border-cyan-500/30">
                      Asignado a ti
                    </span>
                  ) : !conversation.assignedUserId || conversation.status === 'PENDING' ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] px-2 py-0.2 rounded-full bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30">
                        En Cola (Sin Asignar)
                      </span>
                      {user?.role === 'AGENT' && onAssignUser && (
                        <button
                          type="button"
                          onClick={async () => {
                            await onAssignUser(user.id);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-emerald-500/25 to-teal-500/25 border border-emerald-500/50 text-[10px] font-bold text-emerald-300 hover:bg-emerald-500/40 hover:text-white transition shadow-sm animate-pulse"
                          title="Asignarme este caso inmediatamente"
                        >
                          <i className="fa-solid fa-hand-holding-hand text-[9px]"></i>
                          <span>🙋 Tomar Caso</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-[10px] px-2 py-0.2 rounded-full bg-slate-800 text-slate-300 font-semibold border border-slate-700">
                      Tomado por: {conversation.assignedUser?.fullName || 'Otro Operador'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-blue-600/20 border border-blue-500/40 text-[11px] font-bold text-blue-300 shadow-sm">
                    <i className="fa-solid fa-flag text-[10px] text-blue-400"></i>
                    Página: <span className="text-white font-extrabold">{accountName}</span>
                  </span>
                  {conversation.channelAccount?.accountHandle && (
                    <span className="text-[11px] text-slate-400 font-mono">
                      {conversation.channelAccount.accountHandle}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Acciones y Cronómetro */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#080C14] border border-[#00F0FF]/25 text-[11px] text-slate-300 font-tech">
              <i className="fa-solid fa-stopwatch text-[#00F0FF] text-xs"></i>
              <span className="text-slate-400">Espera:</span>
              <span className="font-bold text-[#00F0FF]">2m 45s</span>
            </div>

            {/* Estado de Colaboración o Botón de Compartir con Admin */}
            {conversation.assignedUserId && (
              currentStatus === 'COLLABORATING' ? (
                /* Tanto Operador como Administrador pueden quitar la colaboración */
                <button
                  onClick={handleEndCollaboration}
                  disabled={isSharing}
                  className="px-3 py-1.5 rounded-xl bg-blue-500/20 hover:bg-rose-950/40 border border-blue-500/50 hover:border-rose-500/60 text-blue-300 hover:text-rose-200 text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-blue-500/10 transition group cursor-pointer"
                  title="Finalizar colaboración y devolver el control exclusivo al operador asignado"
                >
                  <i className="fa-solid fa-handshake-angle text-blue-400 group-hover:text-rose-400 text-xs transition"></i>
                  <span className="hidden sm:inline">En Colaboración</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/30 group-hover:bg-rose-500/30 text-blue-200 group-hover:text-rose-200 ml-1 transition">
                    ✕ Quitar
                  </span>
                </button>
              ) : (
                /* Solo el Operador puede ver el botón 'Compartir con Admin' (Al Admin NO le debe aparecer) */
                isAgent && currentStatus !== 'RESOLVED' && (
                  <button
                    onClick={handleShareWithAdmin}
                    disabled={isSharing}
                    className="px-3 py-1.5 bg-blue-950/30 hover:bg-blue-900/40 border border-blue-500/40 hover:border-blue-400 text-blue-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                    title="Compartir chat con Supervisor para intervención conjunta"
                  >
                    <i className="fa-solid fa-users-viewfinder text-xs text-blue-400"></i>
                    <span className="hidden md:inline">Compartir con Admin</span>
                  </button>
                )
              )
            )}

            {/* Selector de Asignación Manual: Solo para Administradores o Supervisores */}
            {!isAgent && (
              <div className="flex items-center gap-1.5 bg-[#080C14] px-2.5 py-1.5 rounded-xl border border-[#00F0FF]/30 text-xs shadow-sm">
                <i className="fa-solid fa-user-plus text-[#00F0FF] text-xs"></i>
                <span className="text-slate-400 hidden sm:inline">Asignar:</span>
                <select
                  value={conversation.assignedUserId || ''}
                  onChange={async (e) => {
                    const selectedVal = e.target.value;
                    if (onAssignUser) {
                      await onAssignUser(selectedVal);
                    }
                  }}
                  className="bg-transparent text-[#00F0FF] font-bold focus:outline-none cursor-pointer text-xs"
                >
                  <option value="" className="bg-[#05080F] text-amber-300">
                    ⚡ Sin Asignar (En Cola)
                  </option>
                  {availableAgents.map((ag) => (
                    <option key={ag.id} value={ag.id} className="bg-[#05080F] text-white">
                      👤 {ag.name} {ag.role ? `(${ag.role})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Botón Marcar Resuelto / Cerrar Caso: Accesible para Operador y Supervisor */}
            {currentStatus !== 'RESOLVED' && onMarkResolved && (
              <button
                onClick={onMarkResolved}
                className="px-3.5 py-1.5 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/50 hover:border-emerald-400 text-emerald-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition shadow-sm shadow-emerald-500/10"
                title="Cerrar y marcar caso como resuelto exitosamente"
              >
                <i className="fa-solid fa-check text-xs text-emerald-400"></i>
                <span className="hidden sm:inline">Marcar Resuelto</span>
              </button>
            )}

            <button
              onClick={() => setIsCrmOpen(!isCrmOpen)}
              className={`px-3.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
                isCrmOpen
                  ? 'bg-[#0E1524] border-[#00F0FF]/40 text-[#00F0FF]'
                  : 'bg-[#080C14] hover:bg-[#0E1422] border-[#141B29] text-slate-300'
              }`}
            >
              <i className="fa-solid fa-id-badge text-xs text-[#00F0FF]"></i>
              <span className="hidden md:inline">Detalle CRM</span>
            </button>
          </div>
        </div>

        {/* Banner para el Operador si el Supervisor solicita Auditoría Interna específica */}
        {isAgent && auditRequest?.status === 'REQUESTED' && (
          <div className="bg-amber-950/90 border-b border-amber-500/60 p-3 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-amber-950/60 z-30 fade-in">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center text-sm flex-shrink-0">
                <i className="fa-solid fa-shield-halved animate-pulse"></i>
              </div>
              <div>
                <p className="text-xs font-bold text-white font-tech flex items-center gap-2">
                  <span>🔔 Solicitud de Auditoría Interna (Ley 1581)</span>
                  <span className="text-[10px] px-2 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Control de Calidad
                  </span>
                </p>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  El supervisor <strong className="text-white">{auditRequest.requestedByName || 'Laura Morales'}</strong> solicita acceso temporal para auditar y monitorear esta conversación. ¿Autorizas el acceso?
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
              <button
                type="button"
                onClick={() => onRespondAudit && onRespondAudit(false)}
                className="px-3 py-1.5 rounded-lg bg-[#080C14] hover:bg-[#121824] border border-[#161F2E] text-slate-300 hover:text-white text-xs font-semibold transition"
              >
                Denegar Acceso
              </button>
              <button
                type="button"
                onClick={() => onRespondAudit && onRespondAudit(true)}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#030508] text-xs font-bold font-tech transition shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
              >
                <i className="fa-solid fa-check"></i>
                <span>Autorizar Auditoría</span>
              </button>
            </div>
          </div>
        )}

        {/* Banner para el Operador cuando la Auditoría Global está Activa por Supervisión */}
        {isAuditModeActive && isAgent && (
          <div className="bg-amber-950/80 border-b border-amber-500/50 px-4 sm:px-6 py-2 flex items-center justify-between text-xs text-amber-300 font-tech animate-pulse">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-eye text-amber-400"></i>
              <span>
                Sesión de Auditoría Interna Activa por Supervisión (Ley 1581) — Inspección para Control de Calidad
              </span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold">
              Monitoreo Activo
            </span>
          </div>
        )}

        {/* Badge para el Supervisor cuando la Auditoría Interna está Activa o Aprobada */}
        {(isAuditModeActive || isAuditApproved) && isAdmin && (
          <div className="bg-amber-950/70 border-b border-amber-500/40 px-4 sm:px-6 py-2 flex items-center justify-between text-xs text-amber-300 font-tech">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-eye text-amber-400 animate-pulse"></i>
              <span>
                {isAuditApproved
                  ? `Auditoría Autorizada por ${conversation.assignedUser?.fullName || 'el operador a cargo'}`
                  : 'Modo Auditoría Interna Activo - Inspección para Control de Calidad (Ley 1581)'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold">
                AuditLog Registrado
              </span>
              {onToggleAuditMode && isAuditModeActive && (
                <button
                  type="button"
                  onClick={() => onToggleAuditMode(false)}
                  className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                >
                  Finalizar
                </button>
              )}
            </div>
          </div>
        )}

        {/* Banner de contexto si es comentario en publicación */}
        {conversation.interactionType === 'POST_COMMENT' && (
          <div className="bg-[#00F0FF]/5 border-b border-[#00F0FF]/15 px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs flex-shrink-0">
            <div className="flex items-center gap-2.5 truncate">
              <span className="w-6 h-6 rounded-lg bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30 flex items-center justify-center flex-shrink-0 text-xs">
                <i className="fa-solid fa-image"></i>
              </span>
              <div className="truncate">
                <span className="text-slate-400">Comentario en publicación: </span>
                <span className="text-white font-medium">
                  {conversation.postTitle || 'Publicación en redes sociales'}
                </span>
              </div>
            </div>
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="text-[#00F0FF] hover:underline flex items-center gap-1 flex-shrink-0 font-medium text-[11px] ml-2"
            >
              <span>Ver post original</span>
              <i className="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
            </a>
          </div>
        )}

        {/* Banner de Advertencia si el Canal no tiene Page Access Token de Meta */}
        {(!conversation.channelAccount?.accessToken ||
          conversation.channelAccount.accessToken.includes('demo') ||
          conversation.channelAccount.accessToken.includes('live-token-') ||
          conversation.channelAccount.accessToken.includes('dummy')) && (
          <div className="bg-amber-950/80 border-b border-amber-500/50 px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs text-amber-200 flex-shrink-0 z-20">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center flex-shrink-0 text-xs">
                <i className="fa-solid fa-triangle-exclamation"></i>
              </span>
              <div>
                <strong className="text-white font-tech block sm:inline mr-2">Token de Meta no configurado:</strong>
                <span>
                  Las respuestas que envíes no llegarán al Facebook Messenger del cliente porque la página <strong className="text-white">'{accountName}'</strong> no tiene su Token de Página de Meta.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setChannelTokenInput(conversation.channelAccount?.accessToken || '');
                setIsTokenModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-tech flex items-center gap-1.5 shadow-md shadow-amber-500/20 flex-shrink-0 self-end sm:self-auto transition"
            >
              <i className="fa-solid fa-key text-[10px]"></i>
              <span>Ingresar Token de Meta</span>
            </button>
          </div>
        )}

        {/* Historial de Mensajes: SuperAdmin Blindado o Vista del Chat */}
        {isSuperAdminBlocked ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#030508] space-y-4 min-h-0">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-950/40">
              <i className="fa-solid fa-user-lock text-2xl"></i>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-tech">
                Blindaje de Privacidad y Secreto Comercial (Ley 1581 de 2012)
              </h3>
              <p className="text-xs text-slate-400 max-w-md mt-1.5 leading-relaxed">
                Por regulaciones de la SIC y secreto comercial multi-tenant, la cuenta de <strong>Super Admin</strong> no
                tiene acceso por defecto a leer las conversaciones privadas entre clientes finales y empresas.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-[#080C14] border border-[#141B29] text-[11px] text-slate-300 max-w-md flex items-center gap-2.5">
              <i className="fa-solid fa-circle-info text-[#00F0FF]"></i>
              <span className="text-left">
                Para auditar este chat, puedes activar el <strong>'Modo Soporte Técnico'</strong> temporal.
              </span>
            </div>
            {onToggleAuditMode && (
              <button
                onClick={() => onToggleAuditMode(true)}
                className="px-4 py-2 rounded-xl bg-[#00F0FF]/15 hover:bg-[#00F0FF]/25 border border-[#00F0FF]/40 text-[#00F0FF] text-xs font-semibold flex items-center gap-2 transition"
              >
                <i className="fa-solid fa-eye text-xs"></i>
                <span>Activar Modo Soporte / Inspeccionar Chat</span>
              </button>
            )}
          </div>
        ) : isAdminBlocked ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#030508] space-y-4 min-h-0">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-950/40">
              <i className="fa-solid fa-user-shield text-2xl"></i>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-tech">
                Atención Privada del Operador - Acceso Supervisión Restringido
              </h3>
              <p className="text-xs text-slate-400 max-w-md mt-1.5 leading-relaxed">
                El contenido de esta conversación está reservado para el operador asignado (
                <strong className="text-white">{conversation.assignedUser?.fullName || 'Operador a cargo'}</strong>
                ). Según la Ley 1581 de protección de datos, para auditar los mensajes se requiere autorización previa del operador o activar el modo de soporte técnico.
              </p>
            </div>

            {auditRequest?.status === 'REQUESTED' ? (
              <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 text-center max-w-md space-y-2 fade-in">
                <div className="flex items-center justify-center gap-2 text-amber-400 font-tech font-bold text-xs">
                  <i className="fa-solid fa-spinner fa-spin text-sm"></i>
                  <span>Solicitud de Auditoría Enviada al Operador</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Se ha enviado la solicitud en tiempo real a <strong className="text-white">{conversation.assignedUser?.fullName || 'el operador'}</strong>. Esperando su autorización para desbloquear la vista de mensajes...
                </p>
              </div>
            ) : auditRequest?.status === 'REJECTED' ? (
              <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 text-center max-w-md space-y-2 fade-in">
                <div className="flex items-center justify-center gap-2 text-rose-400 font-tech font-bold text-xs">
                  <i className="fa-solid fa-circle-xmark text-sm"></i>
                  <span>Auditoría No Autorizada por el Operador</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  El operador <strong className="text-white">{conversation.assignedUser?.fullName || 'a cargo'}</strong> ha denegado la solicitud de auditoría para este caso por reserva legal activa.
                </p>
                {onRequestAudit && (
                  <button
                    type="button"
                    onClick={onRequestAudit}
                    className="mt-2 px-3.5 py-1.5 rounded-lg bg-[#080C14] hover:bg-[#0E1524] border border-rose-500/40 text-rose-300 text-xs font-semibold transition inline-flex items-center gap-1.5"
                  >
                    <i className="fa-solid fa-rotate-right"></i>
                    <span>Volver a Solicitar Autorización</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-[#080C14] border border-[#141B29] text-[11px] text-slate-300 max-w-md flex items-center gap-2.5">
                  <i className="fa-solid fa-handshake-angle text-amber-400"></i>
                  <span className="text-left">
                    Estado actual: <strong>En atención por operador</strong>. Puedes solicitar autorización directa de auditoría interna.
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2.5">
                  {onToggleAuditMode && (
                    <button
                      type="button"
                      onClick={() => onToggleAuditMode(true)}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#030508] text-xs font-bold font-tech flex items-center gap-1.5 transition shadow-md shadow-amber-500/20"
                    >
                      <i className="fa-solid fa-eye text-xs"></i>
                      <span>Activar Modo Auditoría Interna</span>
                    </button>
                  )}
                  {onRequestAudit && (
                    <button
                      type="button"
                      onClick={onRequestAudit}
                      className="px-4 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold font-tech flex items-center gap-2 transition shadow-md shadow-amber-950/40"
                    >
                      <i className="fa-solid fa-user-check text-xs"></i>
                      <span>Solicitar Autorización al Operador</span>
                    </button>
                  )}
                  {onAssignUser && (
                    <button
                      type="button"
                      onClick={() => onAssignUser(user?.id || '')}
                      className="px-4 py-2 rounded-xl bg-[#080C14] hover:bg-[#121824] border border-[#161F2E] text-slate-300 text-xs font-semibold flex items-center gap-2 transition"
                    >
                      <i className="fa-solid fa-user-tag text-xs"></i>
                      <span>Asignarme este caso</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#030508] min-h-0">
            {messages.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-slate-500 text-xs">
                <i className="fa-regular fa-comments text-3xl mb-2 text-slate-600"></i>
                <p>No hay mensajes en esta conversación aún.</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMsgFromAgent = msg.senderType === 'AGENT';

                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 max-w-[85%] sm:max-w-[70%] ${
                      isMsgFromAgent ? 'ml-auto flex-row-reverse' : ''
                    }`}
                  >
                    {!isMsgFromAgent && (
                      <img
                        src={contactAvatar}
                        className="w-7 h-7 rounded-full object-cover mt-1 ring-1 ring-[#1A2332] flex-shrink-0"
                        alt="avatar"
                      />
                    )}
                    {isMsgFromAgent && (
                      <div className="w-7 h-7 rounded-lg bg-[#00F0FF] text-[#030508] font-black flex items-center justify-center text-[10px] mt-1 font-tech flex-shrink-0">
                        KX
                      </div>
                    )}

                    <div>
                      <div
                        className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                          isMsgFromAgent
                            ? 'bg-[#0A1324] text-slate-100 border border-[#00F0FF]/30 rounded-tr-none'
                            : 'bg-[#070B14] text-slate-200 border border-[#141B29] rounded-tl-none'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                      <div
                        className={`flex items-center gap-1.5 mt-1 ${
                          isMsgFromAgent ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <p className="text-[10px] text-slate-500 font-tech">
                          {msg.sentAt
                            ? new Date(msg.sentAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Ahora'}
                        </p>
                        {isMsgFromAgent && (
                          (msg as any).rawPayload?.dispatchSuccess === false ? (
                            <span
                              className="text-[10px] text-rose-400 flex items-center gap-1 font-semibold"
                              title={(msg as any).rawPayload?.dispatchError || 'Error de entrega en Meta Graph API'}
                            >
                              <i className="fa-solid fa-circle-exclamation text-rose-500"></i>
                              <span>No entregado en Messenger</span>
                            </span>
                          ) : (msg as any).rawPayload?.dispatchSuccess === true ? (
                            <span className="text-[10px] text-emerald-400/80 flex items-center gap-0.5">
                              <i className="fa-solid fa-check-double text-[9px]"></i>
                              <span>Entregado a Messenger</span>
                            </span>
                          ) : null
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Formulario de Respuesta */}
        <div className="p-4 sm:p-5 border-t border-[#111622] bg-[#05080F] flex-shrink-0">
          {isSuperAdminBlocked ? (
            <div className="p-3 rounded-xl bg-[#080C14] border border-[#141B29] text-center text-xs text-slate-500">
              <i className="fa-solid fa-lock mr-2 text-slate-600"></i>
              Modo Solo Supervisión de Infraestructura - Respuestas salientes deshabilitadas para Super Admin
            </div>
          ) : isAdminBlocked ? (
            <div className="p-3 rounded-xl bg-[#080C14] border border-[#141B29] text-center text-xs text-slate-400">
              <i className="fa-solid fa-lock mr-2 text-blue-400"></i>
              Chat en atención privada. Respuestas deshabilitadas hasta que el operador comparta la conversación con administración.
            </div>
          ) : isAgent && conversation.assignedUserId !== user?.id ? (
            <div className="p-4 rounded-xl bg-[#080C14] border border-amber-900/40 text-center text-xs text-slate-300 flex items-center justify-center gap-2.5">
              <i className="fa-solid fa-lock text-amber-400 text-sm"></i>
              <div>
                <p className="font-semibold text-amber-300">
                  {!conversation.assignedUserId || conversation.status === 'PENDING'
                    ? 'Caso en cola de espera (Sin Asignar)'
                    : `Caso tomado por ${conversation.assignedUser?.fullName || 'otro operador'}`}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Como operador, solo puedes responder conversaciones asignadas a ti. La asignación es realizada por supervisión.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Barra de Gobernanza y Macros de Cumplimiento Legal */}
              <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950/30 border border-cyan-800/40 text-cyan-300 font-mono">
                  <i className="fa-solid fa-signature text-[10px] text-cyan-400"></i>
                  <span>Firma oficial:</span>
                  <strong className="text-white">{officialSignature}</strong>
                </div>

                <div className="flex items-center gap-2">
                  {conversation.interactionType === 'DIRECT_MESSAGE' ? (
                    <div className="flex items-center gap-2">
                      <div
                        className="px-2.5 py-1 rounded-lg bg-emerald-950/50 border border-emerald-500/50 text-emerald-300 flex items-center gap-1.5 text-[11px] font-semibold shadow-sm shadow-emerald-950/40"
                        title="Cumplimiento estricto obligatorio de la Ley 1581 (SIC)"
                      >
                        <i className="fa-solid fa-shield-halved text-[10px] text-emerald-400"></i>
                        <span>
                          {hasAgentReplied
                            ? '✓ Consentimiento Ley 1581 Registrado'
                            : '✓ Aviso Ley 1581 Obligatorio (1er contacto)'}
                        </span>
                      </div>
                      {!hasAgentReplied && (!inputText.includes('1581') && !inputText.includes('privacidad')) && (
                        <button
                          type="button"
                          onClick={restoreMacroLey1581}
                          className="px-2 py-1 rounded-lg bg-[#080C14] hover:bg-[#0E1524] border border-[#141B29] hover:border-emerald-500/40 text-emerald-400 text-[10px] font-semibold transition flex items-center gap-1"
                          title="Restablecer texto legal de Ley 1581 en el campo de texto"
                        >
                          <i className="fa-solid fa-rotate-left text-[9px]"></i>
                          <span>Restablecer</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={insertMacroDerivarDM}
                      className="px-2.5 py-1 rounded-lg bg-amber-950/40 hover:bg-amber-900/50 border border-amber-600/40 hover:border-amber-500 text-amber-300 transition flex items-center gap-1.5 text-[11px]"
                      title="Proteger datos del usuario derivando a DM privado"
                    >
                      <i className="fa-solid fa-lock text-[10px] text-amber-400"></i>
                      <span>Derivar a DM (Privacidad)</span>
                    </button>
                  )}

                  {/* Botón dedicado de Respuestas Rápidas */}
                  <button
                    type="button"
                    onClick={() => setIsQuickDrawerOpen(!isQuickDrawerOpen)}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 transition ${
                      isQuickDrawerOpen
                        ? 'bg-[#00F0FF]/20 text-[#00F0FF] border-[#00F0FF]/50 shadow-sm shadow-[#00F0FF]/20'
                        : 'bg-[#080C14] hover:bg-[#0E1524] border-[#141B29] hover:border-[#00F0FF]/40 text-slate-300'
                    }`}
                    title="Ver respuestas rápidas predefinidas (/saludo, /precios, /despedida...)"
                  >
                    <i className="fa-solid fa-bolt text-[10px] text-[#00F0FF]"></i>
                    <span>Respuestas Rápidas</span>
                  </button>
                </div>
              </div>

              <form onSubmit={handleSend} className="relative">
                {/* Popover Autocomplete al teclear '/' */}
                {isTypingSlash && matchedTemplates.length > 0 && (
                  <div className="absolute bottom-full left-0 mb-2 w-full max-w-md bg-[#05080F]/95 backdrop-blur-xl border border-[#00F0FF]/50 rounded-2xl shadow-2xl p-2 z-50 fade-in text-xs space-y-1">
                    <div className="px-2.5 py-1 text-[10px] text-slate-400 font-tech font-bold uppercase flex items-center justify-between border-b border-[#141B29] pb-1.5 mb-1">
                      <span className="flex items-center gap-1.5 text-[#00F0FF]">
                        <i className="fa-solid fa-bolt"></i>
                        Sugerencias Rápidas (Tab o Enter para insertar)
                      </span>
                      <span className="text-slate-500">{matchedTemplates.length} encontradas</span>
                    </div>
                    <div className="max-h-52 overflow-y-auto space-y-1">
                      {matchedTemplates.map((tmpl, idx) => (
                        <button
                          key={tmpl.id}
                          type="button"
                          onClick={() => insertQuickTemplate(tmpl)}
                          onMouseEnter={() => setSelectedQuickIndex(idx)}
                          className={`w-full text-left p-2 rounded-xl transition flex items-start justify-between gap-3 ${
                            idx === selectedQuickIndex
                              ? 'bg-[#0E1524] border border-[#00F0FF]/50 text-white'
                              : 'hover:bg-[#080C14] text-slate-300 border border-transparent'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-tech font-bold text-[#00F0FF]">{tmpl.shortcut}</span>
                              <span className="font-semibold text-white text-xs truncate">{tmpl.title}</span>
                            </div>
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">{tmpl.content}</p>
                          </div>
                          <span className="text-[10px] font-tech text-slate-500 flex-shrink-0 mt-0.5">
                            [Tab]
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Menú Flotante de Plantillas al presionar botón Respuestas Rápidas */}
                {isQuickDrawerOpen && (
                  <div className="absolute bottom-full left-0 mb-2 w-full max-w-lg bg-[#05080F]/95 backdrop-blur-xl border border-[#00F0FF]/50 rounded-2xl shadow-2xl p-3 z-50 fade-in text-xs space-y-2">
                    <div className="flex items-center justify-between border-b border-[#141B29] pb-2">
                      <div className="flex items-center gap-2">
                        <i className="fa-solid fa-bolt text-[#00F0FF]"></i>
                        <span className="font-bold text-white font-tech">Plantillas de Respuesta Rápida</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsQuickDrawerOpen(false)}
                        className="text-slate-400 hover:text-white p-1 text-xs"
                      >
                        <i className="fa-solid fa-xmark"></i>
                      </button>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                      {quickTemplates.length === 0 ? (
                        <p className="text-slate-500 text-center py-4">No hay respuestas rápidas configuradas aún.</p>
                      ) : (
                        quickTemplates.map((tmpl) => (
                          <div
                            key={tmpl.id}
                            className="p-2.5 rounded-xl bg-[#080C14] hover:bg-[#0E1524] border border-[#141B29] hover:border-[#00F0FF]/30 transition flex items-start justify-between gap-3 group"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-[#00F0FF] font-tech">{tmpl.shortcut}</span>
                                <span className="font-semibold text-white text-xs">{tmpl.title}</span>
                              </div>
                              <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-2">
                                {tmpl.content}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => insertQuickTemplate(tmpl)}
                              className="px-2.5 py-1 rounded-lg bg-[#00F0FF]/15 hover:bg-[#00F0FF] text-[#00F0FF] hover:text-[#030508] font-tech text-xs font-bold transition flex-shrink-0 mt-1"
                            >
                              Insertar
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                <textarea
                  rows={3}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Escribe una respuesta oficial en nombre de KorevX... (o escribe '/' para respuestas rápidas)"
                  className="w-full bg-[#080C14] border border-[#141B29] focus:border-[#00F0FF]/60 rounded-xl p-3.5 pr-28 text-xs text-slate-200 placeholder-slate-500 focus:outline-none resize-none transition"
                  onKeyDown={(e) => {
                    if (isTypingSlash && matchedTemplates.length > 0) {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setSelectedQuickIndex((prev) => (prev + 1) % matchedTemplates.length);
                        return;
                      }
                      if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setSelectedQuickIndex((prev) => (prev - 1 + matchedTemplates.length) % matchedTemplates.length);
                        return;
                      }
                      if (e.key === 'Tab' || e.key === 'Enter') {
                        e.preventDefault();
                        insertQuickTemplate(matchedTemplates[selectedQuickIndex] || matchedTemplates[0]);
                        return;
                      }
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        setInputText((prev) => prev.trim());
                        return;
                      }
                    }
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(e);
                    }
                  }}
                />
                <div className="absolute right-3 bottom-3 flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={!inputText.trim() || isSending}
                    className="px-4 py-2 bg-[#00F0FF] hover:bg-[#00D7E5] disabled:opacity-40 text-[#030508] font-bold text-xs rounded-lg flex items-center gap-1.5 transition shadow-md shadow-[#00F0FF]/20 font-tech"
                  >
                    {isSending ? (
                      <i className="fa-solid fa-spinner fa-spin text-xs"></i>
                    ) : (
                      <i className="fa-solid fa-paper-plane text-xs"></i>
                    )}
                    <span>Enviar</span>
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Drawer CRM y Línea de Tiempo */}
      {isCrmOpen && (
        <aside className="w-80 border-l border-[#111622] bg-[#05080F] p-4 sm:p-5 flex flex-col overflow-y-auto flex-shrink-0 fade-in min-h-0">
          <div className="flex items-center justify-between pb-3 border-b border-[#111622] flex-shrink-0">
            <div className="flex items-center gap-1 bg-[#080C14] p-1 rounded-xl border border-[#141B29]">
              <button
                onClick={() => setCrmTab('details')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  crmTab === 'details'
                    ? 'bg-[#0E1524] text-white border border-[#00F0FF]/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Ficha CRM
              </button>
              <button
                onClick={() => setCrmTab('timeline')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  crmTab === 'timeline'
                    ? 'bg-[#0E1524] text-[#00F0FF] border border-[#00F0FF]/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <i className="fa-solid fa-clock-rotate-left text-[10px]"></i>
                <span>Línea de Tiempo</span>
              </button>
            </div>

            <button
              onClick={() => setIsCrmOpen(false)}
              className="text-slate-400 hover:text-white text-xs p-1"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>

          {crmTab === 'details' ? (
            <div className="flex-1 overflow-y-auto py-2 space-y-4 min-h-0">
              <div className="text-center py-4 border-b border-[#111622]">
                <img
                  src={contactAvatar}
                  className="w-16 h-16 rounded-full mx-auto object-cover ring-2 ring-[#00F0FF]/40 mb-3"
                  alt="avatar"
                />
                <h3 className="text-sm font-bold text-white font-tech">{contactName}</h3>
                <p className="text-xs text-slate-400">Cliente Recurrente</p>
              </div>

              {/* Cuentas Sociales Vinculadas */}
              <div className="py-2 border-b border-[#111622] space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-tech">
                  Canal del Contacto
                </p>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-[#080C14] border border-[#141B29] text-xs">
                  {getPlatformIcon(platform)}
                  <span className="text-slate-200 truncate">
                    {contactName.toLowerCase().replace(/\s+/g, '_')}
                  </span>
                </div>
              </div>

              {/* Notas Internas del Equipo */}
              <div className="py-2 space-y-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-tech">
                  Notas Internas
                </p>
                <div className="p-3 rounded-xl bg-[#080C14] border border-[#141B29] text-xs text-slate-300">
                  <p className="text-[11px] text-[#00F0FF] font-semibold mb-1">Nota de Carlos Agente:</p>
                  <p className="text-[11px] leading-relaxed">
                    El cliente está interesado en el plan de automatización omnicanal.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto py-3 min-h-0">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-tech">
                  Historial de Estados y Atención
                </p>
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
              </div>
              <ConversationTimeline conversationId={conversation.id} />
            </div>
          )}
        </aside>
      )}

      {/* Modal de Creación de Ticket Interno */}
      <CreateTicketModal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
        conversationId={conversation.id}
        contactName={contactName}
      />

      {/* Modal para Configurar Token de Meta directamente desde la conversación */}
      {isTokenModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md bg-[#05080F] border border-[#141B29] rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#111622] pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center text-sm shadow-sm">
                    <i className="fa-solid fa-key"></i>
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-white font-tech">Vincular Token de Meta</h4>
                    <p className="text-[11px] text-slate-400">Canal: {accountName}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsTokenModalOpen(false)}
                  className="w-7 h-7 rounded-lg bg-[#080C14] hover:bg-[#121824] text-slate-400 hover:text-white border border-[#141B29] flex items-center justify-center text-xs transition"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Para que las respuestas de tus operadores lleguen al <strong>Facebook Messenger</strong> del cliente, pega el <strong>Page Access Token</strong> (Token de Acceso de Página) generado en Meta for Developers.
                </p>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase font-tech block mb-1.5">
                    Page Access Token
                  </label>
                  <input
                    type="password"
                    placeholder="EAA... (Token de larga duración de la Página Meta)"
                    value={channelTokenInput}
                    onChange={(e) => setChannelTokenInput(e.target.value)}
                    autoFocus
                    className="w-full bg-[#080C14] border border-[#141B29] focus:border-[#00F0FF]/60 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 font-mono"
                  />
                </div>

                <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-800/30 text-[11px] text-cyan-300 flex items-start gap-2">
                  <i className="fa-solid fa-circle-info text-cyan-400 mt-0.5"></i>
                  <span>
                    El token se almacena de forma encriptada y habilita de inmediato la salida de mensajes vía Meta Graph API sin recargar la página.
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#111622]">
                <button
                  type="button"
                  onClick={() => setIsTokenModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#080C14] border border-[#141B29] text-slate-400 hover:text-white text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isSavingToken || !channelTokenInput.trim()}
                  onClick={handleSaveChannelToken}
                  className="px-5 py-2 rounded-xl bg-[#00F0FF] hover:bg-[#00D7E5] disabled:opacity-40 disabled:cursor-not-allowed text-[#030508] text-xs font-bold font-tech shadow-md shadow-[#00F0FF]/20 transition flex items-center gap-1.5"
                >
                  {isSavingToken ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin text-xs"></i>
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-check text-xs"></i>
                      <span>Guardar y Activar Salida</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </section>
  );
};
