import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { AppNotification } from '../types';
import { soundManager } from '../utils/audio';

export type MainViewType = 'inbox' | 'dashboard' | 'channels' | 'tickets' | 'admin' | 'superadmin' | 'enterprises' | 'settings';

interface HeaderProps {
  currentView: MainViewType;
  onViewChange: (view: MainViewType) => void;
  onToggleMobileSidebar: () => void;
  onLogout: () => void;
  isAuditModeActive?: boolean;
  onToggleAuditMode?: (enabled: boolean) => void;
  notifications?: AppNotification[];
  onMarkNotificationsAsRead?: () => void;
  isSupportModeActive?: boolean;
  supportModeInfo?: {
    active: boolean;
    enterpriseId?: string;
    enterpriseName?: string;
    adminName?: string;
    adminEmail?: string;
    activatedAt?: string;
  };
  onOpenSupportConsole?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onViewChange,
  onToggleMobileSidebar,
  onLogout,
  isAuditModeActive = false,
  onToggleAuditMode,
  notifications = [],
  onMarkNotificationsAsRead,
  isSupportModeActive = false,
  supportModeInfo,
  onOpenSupportConsole,
}) => {
  const { user } = useAuth();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(soundManager.getIsMuted());
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  return (
    <header className="h-14 border-b border-[#111622] bg-[#05080F] px-4 sm:px-5 flex items-center justify-between relative z-50 flex-shrink-0">
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          onClick={onToggleMobileSidebar}
          className="lg:hidden w-8 h-8 rounded-lg bg-[#0A0E17] hover:bg-[#121824] text-slate-300 flex items-center justify-center border border-[#161F2E]"
          aria-label="Abrir menú"
        >
          <i className="fa-solid fa-bars text-xs"></i>
        </button>

        {/* Logo Oficial KorevX */}
        <div className="flex items-center gap-3">
          <div className="relative group">
            <img
              src="/logo-korevx.png"
              alt="KorevX"
              className="w-8 h-8 rounded-lg object-cover ring-1 ring-[#00F0FF]/40 shadow-sm shadow-[#00F0FF]/25"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-tech font-bold text-base tracking-wide text-white">
                Korev<span className="text-[#00F0FF]">X</span>
              </span>
              <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/30 font-tech">
                Omnichannel
              </span>
            </div>
            <p className="text-[8px] font-bold tracking-[0.2em] uppercase text-slate-400 font-tech">
              Diseñando el Futuro
            </p>
          </div>
        </div>
      </div>

      {/* Navegación de Vistas Principales según Rol */}
      <div className="hidden md:flex items-center gap-1.5 bg-[#080C14] p-1 rounded-xl border border-[#141B29]">
        {user?.role === 'SUPER_ADMIN' ? (
          <>
            {/* Super Admin: 1. Gobernanza Central, 2. Empresas & Administradores, 3. Métricas Corporativas */}
            <button
              onClick={() => onViewChange('superadmin')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
                currentView === 'superadmin'
                  ? 'text-[#00F0FF] bg-[#0E1524] border border-[#00F0FF]/50 shadow-sm shadow-[#00F0FF]/20'
                  : 'text-slate-400 hover:text-[#00F0FF]'
              }`}
            >
              <i className="fa-solid fa-satellite-dish text-xs text-[#00F0FF]"></i>
              <span>Gobernanza Total</span>
            </button>

            <button
              onClick={() => onViewChange('enterprises')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
                currentView === 'enterprises'
                  ? 'text-[#00F0FF] bg-[#0E1524] border border-[#00F0FF]/50 shadow-sm shadow-[#00F0FF]/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <i className="fa-solid fa-building-user text-xs text-[#00F0FF]"></i>
              <span>Empresas & Admins</span>
            </button>

            <button
              onClick={() => onViewChange('dashboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
                currentView === 'dashboard'
                  ? 'text-white bg-[#0E1524] border border-[#00F0FF]/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <i className="fa-solid fa-chart-line text-xs text-[#00F0FF]"></i>
              <span>Métricas Corporativas</span>
            </button>

            {(isSupportModeActive || supportModeInfo?.active) && (
              <button
                onClick={() => {
                  onViewChange('superadmin');
                  if (onOpenSupportConsole) onOpenSupportConsole();
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition bg-amber-950/40 border border-amber-500/60 text-amber-300 hover:bg-amber-900/50 shadow-sm shadow-amber-500/20 animate-pulse"
                title={`Modo Soporte Técnico Autorizado: ${supportModeInfo?.enterpriseName || 'Empresa'}`}
              >
                <i className="fa-solid fa-wrench text-amber-400 text-xs"></i>
                <span>Soporte: {supportModeInfo?.enterpriseName || 'Empresa'}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              </button>
            )}
          </>
        ) : (
          <>
            {/* Bandeja de Entrada (para Operador y Administrador) */}
            <button
              onClick={() => onViewChange('inbox')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
                currentView === 'inbox'
                  ? 'text-white bg-[#0E1524] border border-[#00F0FF]/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <i className="fa-solid fa-inbox text-[#00F0FF] text-xs"></i>
              <span>Bandeja</span>
            </button>

            {/* Métricas y Canales de Empresa (Solo Administrador) */}
            {user?.role === 'ADMIN' && (
              <>
                <button
                  onClick={() => onViewChange('dashboard')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition ${
                    currentView === 'dashboard'
                      ? 'text-white bg-[#0E1524] border border-[#00F0FF]/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <i className="fa-solid fa-chart-line text-xs"></i>
                  <span>Métricas</span>
                </button>

                <button
                  onClick={() => onViewChange('channels')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition ${
                    currentView === 'channels'
                      ? 'text-white bg-[#0E1524] border border-[#00F0FF]/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <i className="fa-solid fa-circle-nodes text-xs"></i>
                  <span>Canales</span>
                </button>
              </>
            )}

            {/* Tickets Internos de Operadores */}
            <button
              onClick={() => onViewChange('tickets')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition ${
                currentView === 'tickets'
                  ? 'text-purple-300 bg-[#0E1524] border border-purple-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-purple-300'
              }`}
            >
              <i className="fa-solid fa-ticket-simple text-xs text-purple-400"></i>
              <span>Tickets</span>
            </button>

            {/* Vista Administrador de Empresa */}
            {user?.role === 'ADMIN' && (
              <>
                <button
                  onClick={() => onViewChange('admin')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition ${
                    currentView === 'admin'
                      ? 'text-amber-300 bg-[#0E1524] border border-amber-500/40'
                      : 'text-slate-400 hover:text-amber-300'
                  }`}
                >
                  <i className="fa-solid fa-user-shield text-xs text-amber-400"></i>
                  <span>Equipo</span>
                </button>

                <button
                  onClick={() => onViewChange('settings')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition ${
                    currentView === 'settings'
                      ? 'text-[#00F0FF] bg-[#0E1524] border border-[#00F0FF]/40 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <i className="fa-solid fa-gear text-xs text-[#00F0FF]"></i>
                  <span>Configuración</span>
                </button>
              </>
            )}
          </>
        )}
      </div>

      {/* Perfil del Usuario, Auditoría y Cierre de Sesión */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Control de Audio / Efectos de Sonido */}
        <button
          onClick={() => {
            const nextMuted = soundManager.toggleMute();
            setIsMuted(nextMuted);
            if (!nextMuted) {
              soundManager.playNotification();
            }
          }}
          title={isMuted ? 'Sonidos Silenciados (clic para activar)' : 'Sonidos Activados (clic para probar sonido o silenciar)'}
          className={`w-8 h-8 rounded-xl border flex items-center justify-center text-xs transition ${
            isMuted
              ? 'bg-rose-950/25 border-rose-500/40 text-rose-400'
              : 'bg-[#080C14] hover:bg-[#0E1524] text-[#00F0FF] border-[#141B29] hover:border-[#00F0FF]/40 shadow-sm shadow-[#00F0FF]/10'
          }`}
        >
          <i className={`fa-solid ${isMuted ? 'fa-volume-xmark' : 'fa-volume-high'}`}></i>
        </button>

        {/* Campana de Notificaciones con Registro */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsNotifOpen((prev) => !prev);
            }}
            title="Notificaciones y Registro de Alertas"
            className="relative w-8 h-8 rounded-xl bg-[#080C14] hover:bg-[#0E1524] text-slate-300 hover:text-white border border-[#141B29] flex items-center justify-center text-xs transition"
          >
            <i className="fa-solid fa-bell text-xs"></i>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white font-bold text-[9px] flex items-center justify-center animate-pulse shadow-sm shadow-rose-500/50">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[#05080F] border border-[#162032] shadow-2xl shadow-black/80 z-[100] p-4 fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-[#111622]">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-bell text-[#00F0FF] text-xs"></i>
                  <h4 className="text-xs font-bold text-white font-tech">Notificaciones & Trazabilidad</h4>
                </div>
                {unreadCount > 0 && onMarkNotificationsAsRead && (
                  <button
                    onClick={onMarkNotificationsAsRead}
                    className="text-[10px] text-[#00F0FF] hover:underline font-semibold font-tech"
                  >
                    Marcar todas leídas
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-[#101726] my-2 space-y-1">
                {notifications.length === 0 ? (
                  <div className="py-6 text-center text-slate-500 text-xs">
                    <i className="fa-regular fa-bell-slash text-lg mb-1 block text-slate-600"></i>
                    No hay notificaciones recientes.
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-2.5 rounded-xl transition ${
                        notif.read ? 'bg-transparent opacity-75' : 'bg-[#090F1C] border border-[#152338]'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5 ${
                          notif.type === 'audit'
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : notif.type === 'channel'
                            ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                            : notif.type === 'security'
                            ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                            : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          <i className={`fa-solid ${
                            notif.type === 'audit'
                              ? 'fa-eye'
                              : notif.type === 'channel'
                              ? 'fa-share-nodes'
                              : notif.type === 'security'
                              ? 'fa-shield-halved'
                              : 'fa-info'
                          }`}></i>
                        </span>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-white truncate font-tech">{notif.title}</p>
                            <span className="text-[9px] text-slate-400 font-tech ml-1 flex-shrink-0">
                              {notif.timestamp}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 leading-snug mt-0.5">
                            {notif.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-2 border-t border-[#111622] text-center">
                <span className="text-[10px] text-slate-400 font-tech">
                  ✓ Eventos registrados con fecha y hora oficial (Ley 1581)
                </span>
              </div>
            </div>
          )}
        </div>

        {user?.role === 'ADMIN' && isAuditModeActive && onToggleAuditMode && (
          <button
            onClick={() => onToggleAuditMode(false)}
            title="Modo Auditoría Interna ACTIVO (Ley 1581). Haz clic para finalizar la sesión."
            className="px-2.5 py-1 rounded-xl border text-[11px] font-tech font-bold flex items-center gap-1.5 bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-500/20 animate-pulse hover:bg-amber-500/30 transition"
          >
            <i className="fa-solid fa-eye text-xs text-amber-400"></i>
            <span className="hidden sm:inline">Auditoría:</span>
            <span>ACTIVA (Finalizar)</span>
          </button>
        )}

        {user?.role === 'AGENT' && isAuditModeActive && (
          <div
            title="Sesión de Auditoría Interna Activa por Supervisión (Ley 1581) para control de calidad"
            className="px-2.5 py-1 rounded-xl border text-[11px] font-tech font-bold flex items-center gap-1.5 bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-sm animate-pulse"
          >
            <i className="fa-solid fa-eye text-xs text-amber-400"></i>
            <span className="hidden sm:inline">Auditoría:</span>
            <span>EN CURSO</span>
          </div>
        )}

        <div className="flex items-center gap-2.5 pl-2.5 border-l border-[#111622]">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00F0FF] to-[#0072FF] text-[#030508] font-black flex items-center justify-center text-xs shadow-sm shadow-[#00F0FF]/25 font-tech">
            {user ? user.fullName.substring(0, 2).toUpperCase() : 'KX'}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold text-white leading-none">
              {user ? user.fullName : 'Usuario'}
            </p>
            <span className="text-[9px] text-slate-400 font-tech uppercase">
              {user?.role === 'SUPER_ADMIN'
                ? 'Super Admin'
                : user?.role === 'ADMIN'
                ? 'Admin Empresa'
                : 'Agente'}
            </span>
          </div>

          <button
            onClick={onLogout}
            title="Cerrar Sesión"
            className="ml-2 w-7 h-7 rounded-lg bg-[#0A0E17] hover:bg-rose-950/40 hover:text-rose-400 text-slate-400 border border-[#161F2E] flex items-center justify-center text-xs transition"
          >
            <i className="fa-solid fa-arrow-right-from-bracket text-[10px]"></i>
          </button>
        </div>
      </div>
    </header>
  );
};
