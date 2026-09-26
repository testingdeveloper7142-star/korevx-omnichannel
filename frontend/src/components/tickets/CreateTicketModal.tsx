import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { TicketType, TicketCategory, TicketPriority } from '../../types';
import { soundManager } from '../../utils/audio';
import { ticketEventBus } from '../../utils/ticketEvents';
import { socketService } from '../../services/socket';

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId?: string;
  contactName?: string;
  onTicketCreated?: () => void;
  forcedType?: TicketType;
}

export const CreateTicketModal: React.FC<CreateTicketModalProps> = ({
  isOpen,
  onClose,
  conversationId,
  contactName,
  onTicketCreated,
  forcedType,
}) => {
  const { user } = useAuth();

  const isOperator = user?.role === 'AGENT';

  const [type, setType] = useState<TicketType>(forcedType || (isOperator ? 'OPERATOR_TO_ADMIN' : 'ADMIN_TO_SUPERADMIN'));
  const [category, setCategory] = useState<TicketCategory>(
    (forcedType === 'ADMIN_TO_SUPERADMIN' || (!isOperator && !forcedType)) ? 'TECH_PLATFORM_ISSUE' : 'L2_SUPPORT'
  );
  const [priority, setPriority] = useState<TicketPriority>('MEDIUM');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [supportModeRequested, setSupportModeRequested] = useState(false);
  const [includeConversation, setIncludeConversation] = useState(!!conversationId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setErrorMsg('Por favor completa el título y la descripción del ticket.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await axios.post('/api/v1/tickets', {
        creatorUserId: user?.id,
        type: isOperator ? 'OPERATOR_TO_ADMIN' : type,
        category,
        priority,
        title: title.trim(),
        description: description.trim(),
        conversationId: includeConversation ? conversationId : undefined,
        supportModeRequested: type === 'ADMIN_TO_SUPERADMIN' ? supportModeRequested : false,
      });

      const createdTicket = res.data;
      const ticketNum = createdTicket?.ticketNumber || Math.floor(1000 + Math.random() * 9000);

      // Emitir en el bus y websocket para que le llegue al Admin en tiempo real
      const eventPayload = {
        type: 'TICKET_CREATED' as const,
        ticket: {
          id: createdTicket?.id,
          ticketNumber: ticketNum,
          title: title.trim(),
          createdById: user?.id,
          creatorName: user?.fullName || 'Operador',
          workspaceId: user?.workspaceId,
        },
      };

      ticketEventBus.emit(eventPayload);
      socketService.emitTicketCreate(eventPayload.ticket);

      soundManager.playNotification();

      // Guardar notificación del sistema para el creador
      const savedNotifs = localStorage.getItem('korevx_notifications');
      const notifs = savedNotifs ? JSON.parse(savedNotifs) : [];
      notifs.unshift({
        id: 'notif-' + Date.now(),
        title: `🎫 Ticket #${ticketNum} Registrado`,
        message: `Has creado exitosamente el ticket: "${title.trim()}". Notificación enviada al Administrador.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'ticket',
        read: false,
      });
      localStorage.setItem('korevx_notifications', JSON.stringify(notifs));

      if (onTicketCreated) onTicketCreated();
      onClose();
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.message || 'Error al crear el ticket. Intenta nuevamente.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-start justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="bg-[#0b101b] border border-cyan-500/30 rounded-2xl w-full max-w-lg p-6 shadow-2xl shadow-cyan-950/40 text-slate-200 my-auto relative z-[100000]">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <i className="fa-solid fa-ticket-simple text-lg"></i>
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Crear Ticket de Incidencia</h3>
              <p className="text-xs text-slate-400">
                {isOperator
                  ? 'Escalamiento interno al Administrador de Empresa'
                  : 'Gestión de incidencias internas y reporte a plataforma'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
            <i className="fa-solid fa-triangle-exclamation"></i>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Tipo de Destinatario (Solo visible para Admin si no viene prefijado) */}
          {!isOperator && !forcedType && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Destinatario del Ticket
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setType('OPERATOR_TO_ADMIN');
                    setCategory('L2_SUPPORT');
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-center space-x-2 transition-all ${
                    type === 'OPERATOR_TO_ADMIN'
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <i className="fa-solid fa-users-gear"></i>
                  <span>Interno (Supervisor)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setType('ADMIN_TO_SUPERADMIN');
                    setCategory('TECH_PLATFORM_ISSUE');
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-center space-x-2 transition-all ${
                    type === 'ADMIN_TO_SUPERADMIN'
                      ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <i className="fa-solid fa-server"></i>
                  <span>A Super Admin (Core)</span>
                </button>
              </div>
            </div>
          )}

          {/* Categoría */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Categoría del Caso
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as TicketCategory)}
              className="w-full bg-[#131b2e] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
            >
              {type === 'OPERATOR_TO_ADMIN' || isOperator ? (
                <>
                  <option value="SPECIAL_APPROVAL">Aprobación Especial</option>
                  <option value="DISCOUNT_AUTHORIZATION">Autorización de Descuento</option>
                  <option value="L2_SUPPORT">Soporte de Nivel 2</option>
                  <option value="ARCO_PRIVACY">Privacidad / Derechos ARCO (Ley 1581)</option>
                  <option value="OTHER">Dudas de Procesos / Consulta Administrativa</option>
                  <option value="OTHER">Problemas de Turno / Horarios</option>
                  <option value="OTHER">Otro requerimiento interno</option>
                </>
              ) : (
                <>
                  <option value="TECH_PLATFORM_ISSUE">Falla Técnica de Plataforma</option>
                  <option value="WEBHOOKS_FAILURE">Caída de Webhooks / Canales Sociales</option>
                  <option value="BILLING">Facturación y Suscripción</option>
                  <option value="OTHER">Consulta de Infraestructura</option>
                </>
              )}
            </select>
          </div>

          {/* Prioridad */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Prioridad
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as TicketPriority[]).map((p) => {
                const colors: Record<TicketPriority, string> = {
                  LOW: 'text-slate-300 border-slate-700 bg-slate-800/40',
                  MEDIUM: 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10',
                  HIGH: 'text-amber-400 border-amber-500/40 bg-amber-500/10',
                  URGENT: 'text-rose-400 border-rose-500/40 bg-rose-500/10',
                };
                const activeColors: Record<TicketPriority, string> = {
                  LOW: 'border-slate-400 ring-1 ring-slate-400',
                  MEDIUM: 'border-cyan-400 ring-1 ring-cyan-400',
                  HIGH: 'border-amber-400 ring-1 ring-amber-400',
                  URGENT: 'border-rose-400 ring-1 ring-rose-400',
                };

                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`py-2 px-1 rounded-xl text-center text-xs font-medium border transition-all ${
                      colors[p]
                    } ${priority === p ? activeColors[p] : 'opacity-70 hover:opacity-100'}`}
                  >
                    {p === 'LOW' && 'Baja'}
                    {p === 'MEDIUM' && 'Media'}
                    {p === 'HIGH' && 'Alta'}
                    {p === 'URGENT' && 'Urgente'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Contexto de Conversación si existe con opción de desvincular */}
          {conversationId && (
            <div className="p-2.5 rounded-xl bg-cyan-950/20 border border-cyan-800/30 flex items-center justify-between text-xs text-cyan-300">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeConversation}
                  onChange={(e) => setIncludeConversation(e.target.checked)}
                  className="rounded border-cyan-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500"
                />
                <span>Vincular a conversación de: <strong>{contactName || 'Cliente'}</strong></span>
              </label>
              <span className="text-[10px] text-cyan-500/70">ID: {conversationId.slice(0, 8)}...</span>
            </div>
          )}

          {/* Título */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Asunto / Título
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Aprobación de descuento 15% para cliente recurrente..."
              className="w-full bg-[#131b2e] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Descripción Detallada
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explica detalladamente la solicitud, contexto o anomalía detectada..."
              className="w-full bg-[#131b2e] border border-slate-700/80 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
            />
          </div>

          {/* Modo Soporte Técnico (Solo Admin a SuperAdmin) */}
          {type === 'ADMIN_TO_SUPERADMIN' && !isOperator && (
            <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-800/30 text-xs">
              <label className="flex items-start space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={supportModeRequested}
                  onChange={(e) => setSupportModeRequested(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 bg-slate-800 text-purple-600 focus:ring-purple-500"
                />
                <div>
                  <span className="font-semibold text-purple-300">
                    Autorizar 'Modo Soporte Técnico' al Super Admin
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Por Ley 1581 y Secreto Comercial, el Super Admin no puede auditar datos privados
                    a menos que tú lo autorices formalmente para atender este ticket.
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* Botones de Acción */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition-all flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-paper-plane"></i>
                  <span>Crear Ticket</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
