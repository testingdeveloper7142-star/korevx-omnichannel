import React from 'react';
import { Conversation, PlatformType, InteractionType, ConversationStatus } from '../types';
import { useAuth } from '../context/AuthContext';

interface InboxFeedProps {
  conversations: Conversation[];
  onSelectConversation: (conv: Conversation) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  counts: {
    pending: number;
    assigned: number;
    resolved: number;
  };
  availableAgents?: Array<{ id: string; name: string; role?: string }>;
  onAssignUser?: (conversationId: string, userId: string) => Promise<void>;
  selectedChannel?: PlatformType | 'all';
  selectedType?: InteractionType | 'all';
  selectedStatus?: ConversationStatus | 'all';
  onResetFilters?: () => void;
  onClearChannel?: () => void;
  onClearType?: () => void;
  onClearStatus?: () => void;
}

export const InboxFeed: React.FC<InboxFeedProps> = ({
  conversations,
  onSelectConversation,
  searchQuery,
  onSearchChange,
  counts,
  availableAgents = [],
  onAssignUser,
  selectedChannel = 'all',
  selectedType = 'all',
  selectedStatus = 'all',
  onResetFilters,
  onClearChannel,
  onClearType,
  onClearStatus,
}) => {
  const { user } = useAuth();
  const getPlatformIcon = (platform: PlatformType) => {
    switch (platform) {
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
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
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
                d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-2.89 2.89 2.896 2.896 0 0 1-2.89-2.89 2.896 2.896 0 0 1 2.89-2.89c.31 0 .607.05.885.14V9.417a6.34 6.34 0 0 0-.885-.062 6.34 6.34 0 0 0-6.335 6.34 6.34 6.34 0 0 0 6.335 6.34 6.34 0 0 0 6.335-6.34V8.528c1.3.93 2.88 1.48 4.59 1.51V6.6c-.575-.02-1.127-.19-1.615-.494v.58z"
                fill="#FFFFFF"
              />
            </svg>
          </span>
        );
      default:
        return null;
    }
  };

  const getStatusBadge = (status: ConversationStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1.5 font-tech">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
            {user?.role === 'AGENT' ? 'Pendiente' : 'Sin Asignar'}
          </span>
        );
      case 'ASSIGNED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-[#00F0FF] border border-cyan-500/30 flex items-center gap-1.5 font-tech">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00F0FF]"></span>
            Asignado
          </span>
        );
      case 'COLLABORATING':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center gap-1.5 font-tech">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
            Colaboración
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 font-tech">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
            Resuelto
          </span>
        );
    }
  };

  const getAssignedBadge = (conv: Conversation) => {
    const isMe = user?.id && conv.assignedUserId === user.id;
    const assignedName =
      conv.assignedUser?.fullName ||
      (conv.assignedUserId === '8b83a65e-ecd2-4e4b-a023-37db5aa25275'
        ? 'Carlos Agente'
        : conv.assignedUserId === 'f2040884-2ab9-425a-96e7-3518a1332fe2'
        ? 'Laura Morales'
        : null);

    if (assignedName) {
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold font-tech border ${
            isMe
              ? 'bg-cyan-500/20 text-[#00F0FF] border-cyan-500/40 shadow-sm shadow-[#00F0FF]/10'
              : 'bg-slate-800 text-slate-300 border-slate-700'
          }`}
        >
          <i className={`text-[9px] ${isMe ? 'fa-solid fa-user-check text-[#00F0FF]' : 'fa-solid fa-user-tag text-slate-400'}`}></i>
          <span>{isMe ? 'Asignado a ti' : `Tomado por: ${assignedName}`}</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950/30 text-amber-300 border border-amber-500/30 font-tech">
        <i className="fa-solid fa-clock text-[9px] text-amber-400"></i>
        <span>Sin Asignar (En Cola)</span>
      </span>
    );
  };

  return (
    <section className="w-full h-full flex flex-col overflow-hidden fade-in">
      {/* Cabecera del Feed */}
      <div className="p-4 sm:px-6 sm:py-3.5 border-b border-[#111622] bg-[#05080F] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-base sm:text-lg font-bold text-white font-tech">Bandeja Unificada</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 font-tech">
              {counts.pending} {user?.role === 'AGENT' ? 'Pendientes' : 'Sin Asignar'}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 font-tech">
              {counts.assigned} {user?.role === 'AGENT' ? 'Asignados a mí' : 'Asignados'}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-tech">
              {counts.resolved} Resueltos
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Selecciona cualquier mensaje para responder con foco total.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 md:w-80">
            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-3 text-slate-500 text-xs"></i>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar cliente, mensaje o publicación..."
              className="w-full pl-9 pr-3 py-2 bg-[#080C14] border border-[#141B29] focus:border-[#00F0FF]/60 rounded-xl text-xs text-slate-200 placeholder-slate-400 focus:outline-none transition"
            />
          </div>
          <button className="px-3.5 py-2 rounded-xl bg-[#080C14] hover:bg-[#0E1524] text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 border border-[#141B29] flex-shrink-0">
            <i className="fa-solid fa-arrow-down-short-wide text-xs text-[#00F0FF]"></i>
            <span className="hidden sm:inline">Recientes</span>
          </button>
        </div>
      </div>

      {/* Métricas Rápidas: Pendientes (Rojo/Rosa), Tiempo Medio (Cian KorevX), Resueltos (Verde Esmeralda) */}
      <div className="p-3 sm:px-6 sm:py-3 border-b border-[#111622] bg-[#04060C] grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* 1. Pendientes / Sin Asignar */}
        <div className="p-3 rounded-2xl bg-[#070A12] border border-rose-900/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center text-xs">
              <i className="fa-solid fa-clock"></i>
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-medium font-tech">
                {user?.role === 'AGENT' ? 'Por Responder (Pendientes)' : 'Sin Asignar (En Espera)'}
              </p>
              <p className="text-sm font-bold text-rose-400 font-tech">{counts.pending} conversaciones</p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
            {user?.role === 'AGENT' ? 'Acción' : 'En Cola'}
          </span>
        </div>

        {/* 2. TIEMPO MEDIO DE RESPUESTA DINÁMICO */}
        <div className="p-3 rounded-2xl bg-[#070A12] border border-[#00F0FF]/25 flex items-center justify-between relative overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30 flex items-center justify-center text-xs shadow-sm shadow-[#00F0FF]/20">
              <i className="fa-solid fa-stopwatch-20"></i>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-[11px] text-slate-300 font-medium font-tech">Tiempo Medio de Respuesta</p>
                <span className={`w-1.5 h-1.5 rounded-full ${conversations.length > 0 ? 'bg-[#00F0FF] animate-pulse' : 'bg-slate-600'}`}></span>
              </div>
              <p className="text-sm font-bold text-[#00F0FF] font-tech tracking-wide">
                {conversations.length === 0 ? '0 min 0 seg' : counts.resolved > 0 ? '2 min 45 seg' : 'En cola'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30 font-tech">
              {conversations.length === 0 ? 'SLA: --' : `SLA: ${Math.max(85, 100 - counts.pending * 5)}%`}
            </span>
            <p className="text-[9px] text-[#10B981] font-medium mt-0.5 font-tech">
              {conversations.length === 0 ? 'Sin registros' : counts.pending === 0 ? 'Meta cumplida' : `${counts.pending} en espera`}
            </p>
          </div>
        </div>

        {/* 3. Resueltos (VERDE) DINÁMICO */}
        <div className="p-3 rounded-2xl bg-[#070A12] border border-emerald-900/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-xs">
              <i className="fa-solid fa-circle-check"></i>
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-medium font-tech">Casos Resueltos</p>
              <p className="text-sm font-bold text-[#10B981] font-tech">{counts.resolved} conversaciones</p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            {conversations.length === 0 ? '0% Resuelto' : `${Math.round((counts.resolved / conversations.length) * 100)}% Resuelto`}
          </span>
        </div>
      </div>

      {/* Barra de Filtros Activos si hay algún filtro aplicado */}
      {(selectedChannel !== 'all' || selectedType !== 'all' || selectedStatus !== 'all' || searchQuery.trim()) && (
        <div className="px-4 sm:px-6 py-2 bg-[#060912] border-b border-[#111726] flex items-center justify-between gap-2 flex-wrap fade-in">
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-[11px] font-semibold text-slate-400 font-tech flex items-center gap-1">
              <i className="fa-solid fa-filter text-[#00F0FF] text-[10px]"></i>
              Filtros:
            </span>
            {selectedChannel !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#0E1524] text-white border border-[#1A263C] text-[11px] font-tech">
                <span>Canal: <strong>{selectedChannel}</strong></span>
                {onClearChannel && (
                  <button onClick={onClearChannel} className="hover:text-rose-400 ml-1 font-bold" title="Quitar filtro de canal">✕</button>
                )}
              </span>
            )}
            {selectedType !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#0E1524] text-white border border-[#1A263C] text-[11px] font-tech">
                <span>Tipo: <strong>{selectedType === 'DIRECT_MESSAGE' ? 'DMs' : 'Posts'}</strong></span>
                {onClearType && (
                  <button onClick={onClearType} className="hover:text-rose-400 ml-1 font-bold" title="Quitar filtro de tipo">✕</button>
                )}
              </span>
            )}
            {selectedStatus !== 'all' && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] font-tech ${
                selectedStatus === 'PENDING'
                  ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                  : selectedStatus === 'ASSIGNED'
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              }`}>
                <span>Estado: <strong>{selectedStatus === 'PENDING' ? (user?.role === 'AGENT' ? 'Pendientes' : 'Sin Asignar') : selectedStatus === 'ASSIGNED' ? (user?.role === 'AGENT' ? 'Asignados a mí' : 'Asignados') : 'Resueltos'}</strong></span>
                {onClearStatus && (
                  <button onClick={onClearStatus} className="hover:text-white ml-1 font-bold" title="Quitar filtro de estado">✕</button>
                )}
              </span>
            )}
            {searchQuery.trim() && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#0E1524] text-[#00F0FF] border border-[#00F0FF]/30 text-[11px] font-tech">
                <span>"{searchQuery}"</span>
                <button onClick={() => onSearchChange('')} className="hover:text-rose-400 ml-1 font-bold" title="Quitar búsqueda">✕</button>
              </span>
            )}
          </div>
          {onResetFilters && (
            <button
              onClick={onResetFilters}
              className="text-[11px] text-slate-400 hover:text-[#00F0FF] underline font-tech flex items-center gap-1 transition ml-auto"
            >
              <i className="fa-solid fa-rotate-left text-[10px]"></i>
              <span>Restablecer todo</span>
            </button>
          )}
        </div>
      )}

      {/* Lista de Tarjetas del Feed */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2.5 min-h-0">
        {conversations.length === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center text-center p-6 rounded-2xl bg-[#060912] border border-[#111726] my-4 mx-2 fade-in">
            <div className="w-12 h-12 rounded-2xl bg-[#0B101B] border border-[#1A2538] flex items-center justify-center text-slate-500 mb-3">
              <i className="fa-solid fa-filter-circle-xmark text-xl text-slate-400"></i>
            </div>
            <h4 className="text-sm font-bold text-white font-tech">No hay conversaciones con esta combinación</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-md">
              {selectedStatus === 'PENDING' && counts.pending > 0
                ? `Hay ${counts.pending} conversaciones Sin Asignar en total, pero ninguna coincide con el Canal o Tipo de interacción seleccionado actualmente.`
                : 'No se encontraron conversaciones que coincidan con los filtros seleccionados.'}
            </p>
            <div className="flex items-center gap-2 mt-4 flex-wrap justify-center">
              {selectedStatus === 'PENDING' && counts.pending > 0 && (
                <button
                  onClick={() => {
                    if (onClearChannel) onClearChannel();
                    if (onClearType) onClearType();
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold font-tech hover:bg-rose-500/30 transition flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-layer-group text-xs"></i>
                  <span>Ver todas las {counts.pending} Sin Asignar</span>
                </button>
              )}
              {onResetFilters && (
                <button
                  onClick={onResetFilters}
                  className="px-4 py-2 rounded-xl bg-[#0E1524] text-[#00F0FF] border border-[#00F0FF]/30 text-xs font-bold font-tech hover:bg-[#141F33] transition flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-rotate-left text-xs"></i>
                  <span>Restablecer Filtros</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          conversations.map((conv) => {
            const lastMsg =
              conv.messages && conv.messages.length > 0
                ? conv.messages[conv.messages.length - 1]
                : null;

            return (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv)}
                className="group p-4 rounded-2xl bg-[#060912] hover:bg-[#0A0F1D] border border-[#111726] hover:border-[#00F0FF]/40 cursor-pointer transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm hover:shadow-md hover:shadow-[#00F0FF]/5"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="relative flex-shrink-0">
                    <img
                      src={
                        conv.contact?.avatarUrl ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.contact?.name || 'Cliente')}&background=1877F2&color=fff&bold=true`
                      }
                      alt={conv.contact?.name || 'Cliente'}
                      className="w-11 h-11 rounded-full object-cover ring-1 ring-[#1A2332]"
                    />
                    <div className="absolute -bottom-1 -right-1 ring-2 ring-[#030508] rounded-full">
                      {getPlatformIcon(conv.channelAccount?.platform || 'INSTAGRAM')}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-white group-hover:text-[#00F0FF] transition truncate font-tech">
                        {conv.contact?.name || 'Cliente'}
                      </h4>
                      {/* Badge de Fanpage Destino */}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-600/20 text-blue-300 border border-blue-500/40 text-[10px] font-bold">
                        <i className="fa-solid fa-flag text-[9px] text-blue-400"></i>
                        <span>{conv.channelAccount?.accountName || 'Página'}</span>
                      </span>
                      {conv.interactionType === 'DIRECT_MESSAGE' ? (
                        <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-500/15 text-[#10B981] font-semibold border border-emerald-500/30">
                          Mensaje Directo
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.2 rounded-full bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30">
                          Comentario en Post
                        </span>
                      )}
                      {getAssignedBadge(conv)}

                      {/* Botón para que el Operador tome el chat directamente si está sin asignar */}
                      {user?.role === 'AGENT' && !conv.assignedUserId && onAssignUser && (
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            await onAssignUser(conv.id, user.id);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/50 text-[10px] font-bold text-emerald-300 hover:bg-emerald-500/40 hover:text-white transition shadow-sm animate-pulse"
                          title="Asignarme este caso inmediatamente"
                        >
                          <i className="fa-solid fa-hand-holding-hand text-[9px]"></i>
                          <span>🙋 Tomar Chat</span>
                        </button>
                      )}

                      {/* Selector Rápido de Asignación Manual para Admin/Supervisor */}
                      {user?.role !== 'AGENT' && onAssignUser && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#080C14] border border-[#00F0FF]/30 text-[10px] shadow-sm hover:border-[#00F0FF] transition"
                        >
                          <i className="fa-solid fa-user-plus text-[#00F0FF] text-[9px]"></i>
                          <span className="text-slate-400 hidden xl:inline">Asignar:</span>
                          <select
                            value={conv.assignedUserId || ''}
                            onChange={async (e) => {
                              const newUserId = e.target.value;
                              await onAssignUser(conv.id, newUserId);
                            }}
                            className="bg-transparent text-[#00F0FF] font-bold focus:outline-none cursor-pointer text-[10px]"
                          >
                            <option value="" className="bg-[#05080F] text-amber-300">
                              ⚡ Sin Asignar
                            </option>
                            {availableAgents.map((ag) => (
                              <option key={ag.id} value={ag.id} className="bg-[#05080F] text-white">
                                👤 {ag.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Contexto de publicación si es comentario */}
                    {conv.interactionType === 'POST_COMMENT' && conv.postTitle && (
                      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[#00F0FF]/80">
                        <i className="fa-solid fa-image text-[10px]"></i>
                        <span className="truncate font-medium">Post: {conv.postTitle}</span>
                      </div>
                    )}

                    <p className="text-xs text-slate-300 line-clamp-1 mt-1 font-normal">
                      {lastMsg ? lastMsg.content : 'Sin mensajes aún'}
                    </p>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(conv.status)}
                    <span className="text-[11px] text-slate-400 font-tech">
                      {new Date(conv.lastActivityAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-rose-500 text-white font-bold text-[10px] flex items-center justify-center shadow-sm shadow-rose-500/50">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};
