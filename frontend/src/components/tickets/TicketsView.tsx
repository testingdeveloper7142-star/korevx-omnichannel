import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { InternalTicket, TicketStatus, TicketPriority } from '../../types';
import { CreateTicketModal } from './CreateTicketModal';
import { soundManager } from '../../utils/audio';

interface TicketsViewProps {
  availableAgents?: Array<{ id: string; name: string }>;
}

export const TicketsView: React.FC<TicketsViewProps> = ({ availableAgents = [] }) => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<InternalTicket[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | TicketStatus>('ALL');
  const [operatorFilter, setOperatorFilter] = useState<string>('ALL');
  const [resolvingTicketId, setResolvingTicketId] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');

  const loadTickets = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get('/api/v1/tickets', {
        params: { workspaceId: user?.workspaceId },
      });
      setTickets(res.data || []);
    } catch (err) {
      console.warn('Error cargando tickets:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [user?.workspaceId]);

  const handleUpdateTicketStatus = async (ticketId: string, status: TicketStatus) => {
    try {
      const targetTicket = tickets.find((t) => t.id === ticketId);
      await axios.patch(`/api/v1/tickets/${ticketId}/status`, {
        status,
        resolutionNotes: resolutionNote.trim() || undefined,
        userId: user?.id,
      });
      setResolvingTicketId(null);
      setResolutionNote('');

      // Notificaciones y Efectos Sonoros
      const savedNotifs = localStorage.getItem('korevx_notifications');
      const notifs = savedNotifs ? JSON.parse(savedNotifs) : [];

      if (status === 'IN_REVIEW') {
        soundManager.playNotification();
        notifs.unshift({
          id: 'notif-' + Date.now(),
          title: '📋 Caso Tomado por Supervisor',
          message: `${user?.fullName || 'Supervisor'} ha tomado el ticket #${targetTicket?.ticketNumber || ''}: "${targetTicket?.title || 'Incidencia'}".`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'assignment',
          read: false,
        });
      } else if (status === 'RESOLVED') {
        soundManager.playSuccess();
        notifs.unshift({
          id: 'notif-' + Date.now(),
          title: '✅ Caso Resuelto',
          message: `El ticket #${targetTicket?.ticketNumber || ''} fue marcado como RESUELTO por ${user?.fullName || 'Supervisor'}.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'general',
          read: false,
        });
      }
      localStorage.setItem('korevx_notifications', JSON.stringify(notifs));

      loadTickets();
    } catch (err) {
      console.warn('Error actualizando ticket:', err);
    }
  };

  const isAgent = user?.role === 'AGENT';

  // Centro de Tickets: exclusivamente solicitudes generadas por los operadores hacia supervisión
  const visibleTickets = (isAgent
    ? tickets.filter((t) => t.createdById === user?.id || t.assignedToId === user?.id)
    : tickets
  ).filter((t) => t.type !== 'ADMIN_TO_SUPERADMIN');

  const filteredTickets = visibleTickets.filter((t) => {
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    if (!isAgent && operatorFilter !== 'ALL') {
      const matchCreated = t.createdById === operatorFilter;
      const matchAssigned = t.assignedToId === operatorFilter;
      const agentObj = availableAgents.find((a) => a.id === operatorFilter);
      const matchName = agentObj && t.createdBy?.fullName?.toLowerCase().includes(agentObj.name.toLowerCase());
      if (!matchCreated && !matchAssigned && !matchName) return false;
    }
    return true;
  });

  const categoryLabels: Record<string, { label: string; color: string }> = {
    SPECIAL_APPROVAL: { label: 'Aprobación Especial', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
    DISCOUNT_AUTHORIZATION: { label: 'Autorización Descuento', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
    L2_SUPPORT: { label: 'Soporte Nivel 2', color: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' },
    ARCO_PRIVACY: { label: 'Privacidad / ARCO (Ley 1581)', color: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
    TECH_PLATFORM_ISSUE: { label: 'Falla Técnica Plataforma', color: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
    WEBHOOKS_FAILURE: { label: 'Caída de Webhooks', color: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
    BILLING: { label: 'Facturación', color: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  };

  const priorityBadges: Record<TicketPriority, { label: string; color: string }> = {
    LOW: { label: 'Baja', color: 'bg-slate-800 text-slate-400 border-slate-700' },
    MEDIUM: { label: 'Media', color: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
    HIGH: { label: 'Alta', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
    URGENT: { label: 'Urgente', color: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
  };

  return (
    <section className="w-full h-full flex flex-col overflow-hidden bg-[#030508] fade-in">
      {/* Cabecera de la Pestaña Tickets */}
      <div className="p-4 sm:px-6 sm:py-4 border-b border-[#111622] bg-[#05080F] flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center justify-center text-xs">
              <i className="fa-solid fa-ticket-simple"></i>
            </span>
            <h2 className="text-base sm:text-lg font-bold text-white font-tech">
              {isAgent ? 'Mis Tickets y Solicitudes' : 'Centro de Tickets e Incidencias'}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {isAgent
              ? 'Revisa el estado de tus solicitudes de aprobación, soporte L2 y consultas a supervisión.'
              : 'Gestiona escalamientos internos, aprobaciones especiales, soporte Nivel 2 y solicitudes ARCO (Ley 1581).'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {isAgent && (
            <button
              onClick={() => setIsTicketModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-purple-900/30 transition"
            >
              <i className="fa-solid fa-plus text-xs"></i>
              <span>Crear Ticket</span>
            </button>
          )}
          <button
            onClick={loadTickets}
            className="p-2 rounded-xl bg-[#080C14] hover:bg-[#0E1422] border border-[#141B29] text-slate-300 hover:text-white text-xs transition"
            title="Refrescar lista"
          >
            <i className="fa-solid fa-rotate-right text-xs"></i>
          </button>
        </div>
      </div>

      {/* Filtros Rápidos de Estado */}
      <div className="px-4 sm:px-6 py-3 border-b border-[#111622] bg-[#04060C] flex items-center gap-2 overflow-x-auto flex-shrink-0">
        <button
          onClick={() => setStatusFilter('ALL')}
          className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
            statusFilter === 'ALL'
              ? 'bg-[#0E1524] text-white border border-[#00F0FF]/40 shadow-sm'
              : 'text-slate-400 hover:text-white bg-[#080C14] border border-[#141B29]'
          }`}
        >
          Todos ({visibleTickets.length})
        </button>
        <button
          onClick={() => setStatusFilter('OPEN')}
          className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
            statusFilter === 'OPEN'
              ? 'bg-amber-950/40 text-amber-300 border border-amber-500/50 shadow-sm'
              : 'text-slate-400 hover:text-amber-300 bg-[#080C14] border border-[#141B29]'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
          <span>Abiertos ({visibleTickets.filter((t) => t.status === 'OPEN').length})</span>
        </button>
        <button
          onClick={() => setStatusFilter('IN_REVIEW')}
          className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
            statusFilter === 'IN_REVIEW'
              ? 'bg-blue-950/40 text-blue-300 border border-blue-500/50 shadow-sm'
              : 'text-slate-400 hover:text-blue-300 bg-[#080C14] border border-[#141B29]'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
          <span>En Revisión ({visibleTickets.filter((t) => t.status === 'IN_REVIEW').length})</span>
        </button>
        <button
          onClick={() => setStatusFilter('RESOLVED')}
          className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
            statusFilter === 'RESOLVED'
              ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/50 shadow-sm'
              : 'text-slate-400 hover:text-emerald-300 bg-[#080C14] border border-[#141B29]'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
          <span>Resueltos ({visibleTickets.filter((t) => t.status === 'RESOLVED').length})</span>
        </button>

        {/* Selector de Operador para Admin / Super Admin */}
        {!isAgent && (
          <div className="ml-auto flex items-center gap-1.5 bg-[#080C14] px-2.5 py-1 rounded-lg border border-[#141B29] text-xs flex-shrink-0">
            <i className="fa-solid fa-filter text-[#00F0FF] text-[10px]"></i>
            <span className="text-slate-400">Operador:</span>
            <select
              value={operatorFilter}
              onChange={(e) => setOperatorFilter(e.target.value)}
              className="bg-transparent text-[#00F0FF] font-bold focus:outline-none cursor-pointer text-xs"
            >
              <option value="ALL" className="bg-[#05080F] text-slate-300">
                Todos los Operadores ({visibleTickets.length})
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

      {/* Contenedor de Tickets con scroll único interno */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 min-h-0">
        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs">
            <i className="fa-solid fa-spinner fa-spin text-2xl text-[#00F0FF] mb-2"></i>
            <p>Cargando tickets...</p>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 rounded-2xl bg-[#05080F] border border-[#111726] text-slate-400 text-xs">
            <i className="fa-regular fa-folder-open text-3xl text-slate-600 mb-3"></i>
            <p className="font-semibold text-slate-300">No hay tickets en esta categoría</p>
            <p className="text-slate-500 mt-1 max-w-sm">
              Puedes crear un nuevo ticket haciendo clic en el botón superior "Crear Ticket".
            </p>
          </div>
        ) : (
          filteredTickets.map((t) => {
            const cat = categoryLabels[t.category] || { label: t.category, color: 'bg-slate-800 text-slate-300 border-slate-700' };
            const priorityInfo = priorityBadges[t.priority] || priorityBadges.MEDIUM;

            return (
              <div
                key={t.id}
                className="p-4 rounded-2xl bg-[#05080F] border border-[#111726] hover:border-slate-700 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-xs text-white">#{t.ticketNumber}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cat.color}`}>
                      {cat.label}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${priorityInfo.color}`}>
                      Prioridad {priorityInfo.label}
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
                    {t.type === 'ADMIN_TO_SUPERADMIN' && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-950/40 text-purple-300 border border-purple-700/50">
                        Escalado a Super Admin
                      </span>
                    )}
                  </div>

                  <h4 className="text-xs sm:text-sm font-bold text-white">{t.title}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">{t.description}</p>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1">
                    <span>
                      Creado por: <strong className="text-slate-300">{t.createdBy?.fullName || 'Operador'}</strong>
                    </span>
                    {t.conversation && (
                      <span>
                        Chat vinculado:{' '}
                        <strong className="text-cyan-400">{t.conversation.contact?.name || 'Cliente'}</strong>
                      </span>
                    )}
                    <span>Fecha: {new Date(t.createdAt).toLocaleString()}</span>
                  </div>

                  {t.resolutionNotes && (
                    <div className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-800/30 text-xs text-emerald-300 mt-2">
                      <strong>Resolución:</strong> {t.resolutionNotes}
                    </div>
                  )}
                </div>

                {/* Acciones de Resolución: Exclusivo para Administrador / Supervisor */}
                {!isAgent && t.status !== 'RESOLVED' && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {resolvingTicketId === t.id ? (
                      <div className="flex items-center gap-2 bg-[#080C14] p-2 rounded-xl border border-slate-800">
                        <input
                          type="text"
                          placeholder="Nota de resolución / aprobación..."
                          value={resolutionNote}
                          onChange={(e) => setResolutionNote(e.target.value)}
                          className="bg-transparent border-b border-slate-700 text-xs text-white px-2 py-1 focus:outline-none focus:border-emerald-400 w-48"
                        />
                        <button
                          onClick={() => handleUpdateTicketStatus(t.id, 'RESOLVED')}
                          className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
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
                            onClick={() => handleUpdateTicketStatus(t.id, 'IN_REVIEW')}
                            className="px-3 py-1.5 rounded-xl bg-blue-950/40 hover:bg-blue-900/50 border border-blue-600/40 text-blue-300 text-xs font-semibold transition"
                          >
                            Tomar Caso
                          </button>
                        )}
                        <button
                          onClick={() => setResolvingTicketId(t.id)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-600/40 text-emerald-300 text-xs font-semibold transition flex items-center gap-1.5"
                        >
                          <i className="fa-solid fa-check"></i>
                          <span>Resolver</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal para crear tickets */}
      <CreateTicketModal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
        onTicketCreated={loadTickets}
      />
    </section>
  );
};
