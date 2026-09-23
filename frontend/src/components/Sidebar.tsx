import React from 'react';
import { PlatformType, InteractionType, ConversationStatus } from '../types';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  selectedChannel: PlatformType | 'all';
  selectedType: InteractionType | 'all';
  selectedStatus: ConversationStatus | 'all';
  counts: {
    pending: number;
    assigned: number;
    resolved: number;
    allChannels: number;
    instagram: number;
    facebook: number;
    tiktok: number;
    whatsapp?: number;
  };
  channels?: Array<{ id: string; platform: PlatformType; isActive: boolean; accountName?: string }>;
  onChannelSelect: (channel: PlatformType | 'all') => void;
  onTypeSelect: (type: InteractionType | 'all') => void;
  onStatusSelect: (status: ConversationStatus | 'all') => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  selectedChannel,
  selectedType,
  selectedStatus,
  counts,
  channels,
  onChannelSelect,
  onTypeSelect,
  onStatusSelect,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { user } = useAuth();
  const isAgent = user?.role === 'AGENT';

  const hasIgChannel = channels ? channels.some((c) => c.platform === 'INSTAGRAM') : false;
  const hasFbChannel = channels ? channels.some((c) => c.platform === 'FACEBOOK') : false;
  const hasTtChannel = channels ? channels.some((c) => c.platform === 'TIKTOK') : false;
  const hasWaChannel = channels ? channels.some((c) => c.platform === 'WHATSAPP') : false;

  const isIgActive = channels ? channels.some((c) => c.platform === 'INSTAGRAM' && c.isActive) : false;
  const isFbActive = channels ? channels.some((c) => c.platform === 'FACEBOOK' && c.isActive) : false;
  const isTtActive = channels ? channels.some((c) => c.platform === 'TIKTOK' && c.isActive) : false;
  const isWaActive = channels ? channels.some((c) => c.platform === 'WHATSAPP' && c.isActive) : false;

  return (
    <>
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/80 z-30 lg:hidden backdrop-blur-sm"
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 border-r border-[#111622] bg-[#05080F] flex flex-col flex-shrink-0 transform ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 transition-transform duration-200 ease-in-out`}
      >
        {/* Espacio de Trabajo / Empresa Asignada */}
        <div className="p-3 border-b border-[#111622] flex items-center justify-between">
          <div className="flex-1 flex items-center gap-2.5 p-2 rounded-xl bg-[#080C14] border border-[#141B29] text-left">
            <div className="w-7 h-7 rounded-lg bg-[#0D1424] border border-[#00F0FF]/30 text-[#00F0FF] flex items-center justify-center font-tech font-bold text-xs flex-shrink-0">
              {user?.workspaceName ? user.workspaceName.slice(0, 2).toUpperCase() : 'KX'}
            </div>
            <div className="truncate">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold truncate text-white" title={user?.workspaceName}>
                  {user?.workspaceName || 'KorevX Oficial'}
                </p>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-[#10B981] font-semibold border border-emerald-500/30">
                  Online
                </span>
              </div>
              <p className="text-[10px] text-slate-400">Espacio de Trabajo Asignado</p>
            </div>
          </div>
          <button onClick={onCloseMobile} className="lg:hidden ml-2 p-2 text-slate-400 hover:text-white">
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        {/* CONTENEDOR CENTRAL COMPACTO Y SIN SCROLLBAR MOLESTA */}
        <div className="flex-1 overflow-y-auto min-h-0 no-scrollbar">
          {/* REDES SOCIALES */}
          <div className="p-2.5 space-y-1">
            <p className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-0.5 font-tech">
              Canales
            </p>

          {/* 0. TODOS LOS CANALES */}
          <button
            onClick={() => onChannelSelect('all')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition ${
              selectedChannel === 'all'
                ? 'font-semibold text-white bg-[#0A0F1A] border-l-2 border-[#00F0FF] border-y border-r border-[#151F32]'
                : 'font-medium text-slate-400 hover:text-white hover:bg-[#090D16] border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className={`w-2 h-2 rounded-full ${selectedChannel === 'all' ? 'bg-[#00F0FF] shadow-sm shadow-[#00F0FF]/50 animate-pulse' : 'bg-slate-700'}`}></span>
              <i className="fa-solid fa-layer-group text-xs w-4 text-center text-[#00F0FF]"></i>
              <span>Todos los Canales</span>
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#00F0FF]/15 text-[#00F0FF]">
              {counts.allChannels}
            </span>
          </button>

          {/* 1. INSTAGRAM (Rosa / Magenta) */}
          {hasIgChannel && (!isAgent || isIgActive) && (
            <button
              onClick={() => onChannelSelect(selectedChannel === 'INSTAGRAM' ? 'all' : 'INSTAGRAM')}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition ${
                selectedChannel === 'INSTAGRAM'
                  ? 'font-semibold text-white bg-[#140810] border-l-2 border-pink-500 border-y border-r border-[#260e1d] shadow-sm shadow-pink-950/20'
                  : 'font-medium text-slate-400 hover:text-white hover:bg-[#090D16] border border-transparent'
              } ${!isIgActive ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center gap-2.5">
                <span className={`w-2 h-2 rounded-full ${selectedChannel === 'INSTAGRAM' ? 'bg-pink-500 shadow-sm shadow-pink-500/50' : 'bg-slate-700'}`}></span>
                <span className="w-4 h-4 rounded flex items-center justify-center bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-[9px] text-white flex-shrink-0">
                  <i className="fa-brands fa-instagram"></i>
                </span>
                <span>Instagram {!isIgActive && '(Pausado)'}</span>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-pink-500/15 text-pink-400 border border-pink-500/20">
                {counts.instagram}
              </span>
            </button>
          )}

          {/* 2. FACEBOOK (Azul Facebook) */}
          {hasFbChannel && (!isAgent || isFbActive) && (
            <button
              onClick={() => onChannelSelect(selectedChannel === 'FACEBOOK' ? 'all' : 'FACEBOOK')}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition ${
                selectedChannel === 'FACEBOOK'
                  ? 'font-semibold text-white bg-[#060e1c] border-l-2 border-[#1877F2] border-y border-r border-[#0d1e38] shadow-sm shadow-blue-950/20'
                  : 'font-medium text-slate-400 hover:text-white hover:bg-[#090D16] border border-transparent'
              } ${!isFbActive ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center gap-2.5">
                <span className={`w-2 h-2 rounded-full ${selectedChannel === 'FACEBOOK' ? 'bg-[#1877F2] shadow-sm shadow-blue-500/50' : 'bg-slate-700'}`}></span>
                <span className="w-4 h-4 rounded flex items-center justify-center bg-[#1877F2] text-[9px] text-white flex-shrink-0">
                  <i className="fa-brands fa-facebook-f"></i>
                </span>
                <span>Facebook {!isFbActive && '(Pausado)'}</span>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/20">
                {counts.facebook}
              </span>
            </button>
          )}

          {/* 3. TIKTOK (Neón Cian / Rojo) */}
          {hasTtChannel && (!isAgent || isTtActive) && (
            <button
              onClick={() => onChannelSelect(selectedChannel === 'TIKTOK' ? 'all' : 'TIKTOK')}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition ${
                selectedChannel === 'TIKTOK'
                  ? 'font-semibold text-white bg-[#05131a] border-l-2 border-cyan-400 border-y border-r border-[#0e2733] shadow-sm shadow-cyan-950/20'
                  : 'font-medium text-slate-400 hover:text-white hover:bg-[#090D16] border border-transparent'
              } ${!isTtActive ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center gap-2.5">
                <span className={`w-2 h-2 rounded-full ${selectedChannel === 'TIKTOK' ? 'bg-cyan-400 shadow-sm shadow-cyan-400/50' : 'bg-slate-700'}`}></span>
                <span className="w-4 h-4 rounded bg-black border border-slate-700/80 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none">
                    <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-2.89 2.89 2.896 2.896 0 0 1-2.89-2.89 2.896 2.896 0 0 1-2.89-2.89c.31 0 .607.05.885.14V9.417a6.34 6.34 0 0 0-.885-.062 6.34 6.34 0 0 0-6.335 6.34 6.34 6.34 0 0 0 6.335 6.34 6.34 6.34 0 0 0 6.335-6.34V8.528c1.3.93 2.88 1.48 4.59 1.51V6.6c-.575-.02-1.127-.19-1.615-.494v.58z" fill="#00F2FE" transform="translate(-0.6, -0.6)" />
                    <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-2.89 2.89 2.896 2.896 0 0 1-2.89-2.89 2.896 2.896 0 0 1-2.89-2.89c.31 0 .607.05.885.14V9.417a6.34 6.34 0 0 0-.885-.062 6.34 6.34 0 0 0-6.335 6.34 6.34 6.34 0 0 0 6.335 6.34 6.34 6.34 0 0 0 6.335-6.34V8.528c1.3.93 2.88 1.48 4.59 1.51V6.6c-.575-.02-1.127-.19-1.615-.494v.58z" fill="#FE2C55" transform="translate(0.6, 0.6)" />
                    <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-2.89 2.89 2.896 2.896 0 0 1-2.89-2.89 2.896 2.896 0 0 1-2.89-2.89c.31 0 .607.05.885.14V9.417a6.34 6.34 0 0 0-.885-.062 6.34 6.34 0 0 0-6.335 6.34 6.34 6.34 0 0 0 6.335 6.34 6.34 6.34 0 0 0 6.335-6.34V8.528c1.3.93 2.88 1.48 4.59 1.51V6.6c-.575-.02-1.127-.19-1.615-.494v.58z" fill="#FFFFFF" />
                  </svg>
                </span>
                <span>TikTok {!isTtActive && '(Pausado)'}</span>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/20">
                {counts.tiktok}
              </span>
            </button>
          )}

          {/* 4. WHATSAPP (Verde WhatsApp) */}
          {hasWaChannel && (!isAgent || isWaActive) && (
            <button
              onClick={() => onChannelSelect(selectedChannel === 'WHATSAPP' ? 'all' : 'WHATSAPP')}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition ${
                selectedChannel === 'WHATSAPP'
                  ? 'font-semibold text-white bg-[#06140e] border-l-2 border-[#25D366] border-y border-r border-[#0d2a1d] shadow-sm shadow-emerald-950/20'
                  : 'font-medium text-slate-400 hover:text-white hover:bg-[#090D16] border border-transparent'
              } ${!isWaActive ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center gap-2.5">
                <span className={`w-2 h-2 rounded-full ${selectedChannel === 'WHATSAPP' ? 'bg-[#25D366] shadow-sm shadow-emerald-500/50' : 'bg-slate-700'}`}></span>
                <span className="w-4 h-4 rounded flex items-center justify-center bg-[#25D366] text-[9px] text-white flex-shrink-0">
                  <i className="fa-brands fa-whatsapp"></i>
                </span>
                <span>WhatsApp {!isWaActive && '(Pausado)'}</span>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                {counts.whatsapp || 0}
              </span>
            </button>
          )}

          {(!channels || channels.length === 0) && (
            <div className="p-3 text-center rounded-xl bg-[#080C14] border border-[#141B29] my-1">
              <p className="text-[11px] font-semibold text-slate-400 font-tech">Sin canales vinculados</p>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                Los canales borrados no se muestran. Conecta redes en <strong className="text-[#00F0FF]">Canales</strong>.
              </p>
            </div>
          )}

          {/* Canales dinámicos adicionales (ej: X / Twitter, Telegram, etc.) */}
          {channels &&
            channels
              .filter((c) => !['INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'WHATSAPP'].includes(c.platform))
              .map((c) => {
                if (isAgent && !c.isActive) return null;
                const isSelected = selectedChannel === c.platform;
                return (
                  <button
                    key={c.id}
                    onClick={() => onChannelSelect(isSelected ? 'all' : c.platform)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition ${
                      isSelected
                        ? 'font-semibold text-white bg-[#0A0F1A] border-l-2 border-[#00F0FF] border-y border-r border-[#151F32]'
                        : 'font-medium text-slate-400 hover:text-white hover:bg-[#090D16] border border-transparent'
                    } ${!c.isActive ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-[#00F0FF]' : 'bg-slate-700'}`}></span>
                      <span className="w-4 h-4 rounded flex items-center justify-center bg-slate-800 text-[9px] text-white flex-shrink-0">
                        {c.platform === 'TWITTER_X' ? (
                          <i className="fa-brands fa-x-twitter"></i>
                        ) : (
                          <i className="fa-solid fa-satellite-dish"></i>
                        )}
                      </span>
                      <span className="truncate">{c.accountName || c.platform} {!c.isActive && '(Pausado)'}</span>
                    </div>
                  </button>
                );
              })}
        </div>

        {/* Tipo de Interacción */}
        <div className="p-2.5 space-y-1 border-t border-[#111622]">
          <p className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-0.5 font-tech">
            Tipo de Interacción
          </p>

          <button
            onClick={() => onTypeSelect('all')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition ${
              selectedType === 'all'
                ? 'font-semibold text-white bg-[#0A0F1A] border-l-2 border-[#00F0FF] border-y border-r border-[#151F32]'
                : 'font-medium text-slate-400 hover:text-white hover:bg-[#090D16] border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${selectedType === 'all' ? 'bg-[#00F0FF]' : 'bg-slate-700'}`}></span>
              <i className="fa-solid fa-shapes text-slate-400 text-xs w-4 text-center"></i>
              <span>Todos los Tipos</span>
            </div>
          </button>

          <button
            onClick={() => onTypeSelect(selectedType === 'DIRECT_MESSAGE' ? 'all' : 'DIRECT_MESSAGE')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition ${
              selectedType === 'DIRECT_MESSAGE'
                ? 'font-semibold text-white bg-[#06140e] border-l-2 border-[#10B981] border-y border-r border-[#0d2a1d]'
                : 'font-medium text-slate-400 hover:text-white hover:bg-[#090D16] border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${selectedType === 'DIRECT_MESSAGE' ? 'bg-[#10B981]' : 'bg-slate-700'}`}></span>
              <i className="fa-solid fa-paper-plane text-[#10B981] text-xs w-4 text-center"></i>
              <span>Mensajes Directos</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-[#10B981] font-semibold border border-emerald-500/30">
              DMs
            </span>
          </button>

          <button
            onClick={() => onTypeSelect(selectedType === 'POST_COMMENT' ? 'all' : 'POST_COMMENT')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition ${
              selectedType === 'POST_COMMENT'
                ? 'font-semibold text-white bg-[#160f06] border-l-2 border-amber-400 border-y border-r border-[#2d1e0c]'
                : 'font-medium text-slate-400 hover:text-white hover:bg-[#090D16] border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${selectedType === 'POST_COMMENT' ? 'bg-amber-400' : 'bg-slate-700'}`}></span>
              <i className="fa-solid fa-comments text-amber-400 text-xs w-4 text-center"></i>
              <span>Comentarios en Posts</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">
              Posts
            </span>
          </button>
        </div>

        {/* BANDEJAS DE ESTADO: 4 ESTADOS CON TRATAMIENTO SIMÉTRICO Y ELEGANTE */}
        <div className="p-2.5 space-y-1 border-t border-[#111622]">
          <p className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-0.5 font-tech">
            Estados
          </p>

          {/* 0. TODOS LOS ESTADOS */}
          <button
            onClick={() => onStatusSelect('all')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              selectedStatus === 'all'
                ? 'text-white bg-[#0A0F1A] border-l-2 border-[#00F0FF] border-y border-r border-[#151F32]'
                : 'text-slate-400 hover:text-white hover:bg-[#090D16] border border-transparent'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${selectedStatus === 'all' ? 'bg-[#00F0FF] animate-pulse' : 'bg-slate-700'}`}></span>
              <i className="fa-solid fa-inbox text-[#00F0FF] text-xs w-4 text-center"></i>
              <span>Todos los Estados</span>
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#00F0FF]/15 text-[#00F0FF]">
              {counts.allChannels}
            </span>
          </button>

          {/* 1. PENDIENTES / SIN ASIGNAR (ROJO / ROSA) */}
          <button
            onClick={() => onStatusSelect(selectedStatus === 'PENDING' ? 'all' : 'PENDING')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              selectedStatus === 'PENDING'
                ? 'text-white bg-[#140608] border-l-2 border-rose-500 border-y border-r border-[#2d0f14]'
                : 'text-slate-400 hover:text-white hover:bg-[#090D16] border border-transparent'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 shadow-sm shadow-rose-500 animate-pulse"></span>
              <span>{isAgent ? 'Pendientes' : 'Sin Asignar'}</span>
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30">
              {counts.pending}
            </span>
          </button>

          {/* 2. ASIGNADOS A MÍ / ASIGNADOS (ÁMBAR / AMARILLO) */}
          <button
            onClick={() => onStatusSelect(selectedStatus === 'ASSIGNED' ? 'all' : 'ASSIGNED')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              selectedStatus === 'ASSIGNED'
                ? 'text-white bg-[#160f06] border-l-2 border-amber-400 border-y border-r border-[#2d1e0c]'
                : 'text-slate-400 hover:text-white hover:bg-[#090D16] border border-transparent'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 shadow-sm shadow-amber-400"></span>
              <span>{isAgent ? 'Asignados a mí' : 'Asignados'}</span>
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
              {counts.assigned}
            </span>
          </button>

          {/* 3. RESUELTOS (VERDE ESMERALDA) */}
          <button
            onClick={() => onStatusSelect(selectedStatus === 'RESOLVED' ? 'all' : 'RESOLVED')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              selectedStatus === 'RESOLVED'
                ? 'text-white bg-[#06140e] border-l-2 border-[#10B981] border-y border-r border-[#0d2a1d]'
                : 'text-slate-400 hover:text-white hover:bg-[#090D16] border border-transparent'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#10B981] shadow-sm shadow-emerald-500"></span>
              <span>Resueltos</span>
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              {counts.resolved}
            </span>
          </button>
        </div>
        </div>

        {/* Footer Info */}
        <div className="p-3 border-t border-[#111622] bg-[#030508] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
            <span className="text-[10px] text-slate-500">API Conectada</span>
          </div>
          <span className="text-[10px] text-slate-400 font-tech">KorevX Core</span>
        </div>
      </aside>
    </>
  );
};
