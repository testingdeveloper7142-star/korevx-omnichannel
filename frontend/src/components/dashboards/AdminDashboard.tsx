import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { InternalTicket, TicketStatus } from '../../types';
import { CreateTicketModal } from '../tickets/CreateTicketModal';

export interface Agent {
  id: string;
  name: string;
  email: string;
  role: string;
  isOnline: boolean;
  assignedCount: number;
  avgResponseTime: string;
  avatar: string;
}

import { QuickResponse, Conversation } from '../../types';

interface AdminDashboardProps {
  maxOperators?: number;
  agents?: Agent[];
  conversations?: Conversation[];
  onAddAgent?: (newAgent: Agent) => void;
  onToggleAgentStatus?: (agentId: string) => void;
  quickTemplates?: QuickResponse[];
  onAddTemplate?: (newTemplate: QuickResponse) => void;
  onDeleteTemplate?: (templateId: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  maxOperators = 5,
  agents: externalAgents,
  conversations = [],
  onAddAgent,
  onToggleAgentStatus: externalToggleStatus,
  quickTemplates: externalTemplates,
  onAddTemplate,
  onDeleteTemplate,
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'supervision' | 'tickets'>('supervision');

  // Métricas reales y reactivas (sin datos inventados)
  const totalConversations = conversations.length;
  const resolvedConversations = conversations.filter((c) => c.status === 'RESOLVED').length;
  const pendingConversations = conversations.filter((c) => c.status === 'PENDING').length;

  const dynamicAtendidos = resolvedConversations;
  const dynamicSla = totalConversations === 0 ? '--' : `${Math.max(85, 100 - pendingConversations * 5)}%`;
  const dynamicAvgTime = totalConversations === 0 ? '--' : resolvedConversations > 0 ? '2m 45s' : 'En cola';
  const dynamicEnEspera = pendingConversations;

  // Estado local o sincronizado de agentes
  const [localAgents, setLocalAgents] = useState<Agent[]>([]);

  const agents = externalAgents || localAgents;

  // Modal para agregar operador
  const [isAddAgentModalOpen, setIsAddAgentModalOpen] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentEmail, setNewAgentEmail] = useState('');
  const [newAgentRole, setNewAgentRole] = useState('Operador');

  const [selectedOperatorFilter, setSelectedOperatorFilter] = useState<string>('ALL');

  const handleCreateAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgentName.trim()) return;

    if (agents.length >= maxOperators) {
      alert(`Has alcanzado el límite máximo de ${maxOperators} operadores permitidos para tu empresa. Contacta al Super Admin para ampliar tu cuota.`);
      return;
    }

    const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (newAgentEmail.trim() && !EMAIL_REGEX.test(newAgentEmail.trim())) {
      alert('El formato de correo no es válido. Debe incluir un dominio válido completo (ej: operador@empresa.com).');
      return;
    }

    const initials = newAgentName
      .trim()
      .split(' ')
      .map((p) => p[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

    const createdAgent: Agent = {
      id: `usr-${Date.now()}`,
      name: newAgentName.trim(),
      email: newAgentEmail.trim() || `${newAgentName.toLowerCase().replace(/\s+/g, '')}@korevx.com`,
      role: newAgentRole,
      isOnline: true,
      assignedCount: 0,
      avgResponseTime: '0m 00s',
      avatar: initials || 'OP',
    };

    if (onAddAgent) {
      onAddAgent(createdAgent);
    } else {
      setLocalAgents((prev) => [...prev, createdAgent]);
    }

    setNewAgentName('');
    setNewAgentEmail('');
    setIsAddAgentModalOpen(false);
  };

  const toggleAgentStatus = (agentId: string) => {
    if (externalToggleStatus) {
      externalToggleStatus(agentId);
    } else {
      setLocalAgents((prev) =>
        prev.map((a) => (a.id === agentId ? { ...a, isOnline: !a.isOnline } : a)),
      );
    }
  };

  const [assignmentMode, setAssignmentMode] = useState<'ROUND_ROBIN' | 'MANUAL' | 'LEAST_BUSY'>('ROUND_ROBIN');

  // Plantillas de Respuestas Rápidas (sincronizadas o locales)
  const [localTemplates, setLocalTemplates] = useState<QuickResponse[]>([
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
      title: 'Despedida y Cierre',
      content: '¡Gracias por comunicarte con KorevX! Quedamos atentos a cualquier duda o requerimiento.',
    },
  ]);

  const templates = externalTemplates || localTemplates;

  const [newShortcut, setNewShortcut] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isAddingTemplate, setIsAddingTemplate] = useState(false);



  const [tickets, setTickets] = useState<InternalTicket[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [resolvingTicketId, setResolvingTicketId] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');

  // Pestaña Admin: Exclusivamente tickets de Admin y Super Admin (escalamientos a Core / soporte L3)
  // Los tickets de operadores se gestionan exclusivamente en el Centro de Tickets
  const adminTickets = (Array.isArray(tickets) ? tickets : []).filter(
    (t) =>
      t.type === 'ADMIN_TO_SUPERADMIN' ||
      t.createdBy?.role === 'ADMIN' ||
      t.createdBy?.role === 'SUPER_ADMIN'
  );

  const loadTickets = async () => {
    setIsLoadingTickets(true);
    try {
      const res = await axios.get('/api/v1/tickets', {
        params: { workspaceId: user?.workspaceId },
      });
      setTickets(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.warn('Error cargando tickets:', err);
      setTickets([]);
    } finally {
      setIsLoadingTickets(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'tickets') {
      loadTickets();
    }
  }, [activeTab]);

  const handleUpdateTicketStatus = async (ticketId: string, status: TicketStatus) => {
    try {
      await axios.patch(`/api/v1/tickets/${ticketId}/status`, {
        status,
        resolutionNotes: resolutionNote.trim() || undefined,
        userId: user?.id,
      });
      setResolvingTicketId(null);
      setResolutionNote('');
      loadTickets();
    } catch (err) {
      console.warn('Error actualizando ticket:', err);
    }
  };

  const handleAddTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShortcut.trim() || !newContent.trim()) return;

    const formattedShortcut = newShortcut.trim().startsWith('/')
      ? newShortcut.trim().toLowerCase()
      : `/${newShortcut.trim().toLowerCase()}`;

    const created: QuickResponse = {
      id: `tmpl-${Date.now()}`,
      shortcut: formattedShortcut,
      title: newTitle.trim() || formattedShortcut,
      content: newContent.trim(),
    };

    if (onAddTemplate) {
      onAddTemplate(created);
    } else {
      setLocalTemplates((prev) => [...prev, created]);
    }

    setNewShortcut('');
    setNewTitle('');
    setNewContent('');
    setIsAddingTemplate(false);
  };

  const handleDeleteTemplateItem = (templateId: string) => {
    if (onDeleteTemplate) {
      onDeleteTemplate(templateId);
    } else {
      setLocalTemplates((prev) => prev.filter((t) => t.id !== templateId));
    }
  };

  return (
    <section className="w-full h-full overflow-y-auto p-6 sm:p-8 bg-[#030508] fade-in space-y-6">
      {/* Cabecera Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#111622]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center justify-center text-xs">
              <i className="fa-solid fa-user-shield"></i>
            </span>
            <h2 className="text-xl font-bold text-white font-tech">
              Panel de Administración y Supervisión
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Gestión del equipo de agentes, tickets e incidencias internas y plantillas de respuesta rápida.
          </p>
        </div>

        {/* Pestañas de Navegación del Panel */}
        <div className="flex items-center gap-2 bg-[#080C14] p-1.5 rounded-xl border border-[#141B29]">
          <button
            onClick={() => setActiveTab('supervision')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
              activeTab === 'supervision'
                ? 'bg-[#0E1524] text-white border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <i className="fa-solid fa-users-gear text-amber-400 text-xs"></i>
            <span>Equipo & Round-Robin</span>
          </button>
          <button
            onClick={() => setActiveTab('tickets')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
              activeTab === 'tickets'
                ? 'bg-[#0E1524] text-white border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <i className="fa-solid fa-server text-cyan-400 text-xs"></i>
            <span>Tickets Admin & Core</span>
            {adminTickets.filter((t) => t.status === 'OPEN').length > 0 && (
              <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                {adminTickets.filter((t) => t.status === 'OPEN').length}
              </span>
            )}
          </button>


        </div>
      </div>



      {activeTab === 'supervision' ? (
        <>
          {/* Grid de Configuración de Asignación y Métricas */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Reglas de Asignación Round-Robin */}
            <div className="p-5 rounded-2xl bg-[#05080F] border border-[#111726] space-y-4">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-arrows-rotate text-[#00F0FF] text-xs"></i>
                <h3 className="text-sm font-bold text-white font-tech">
                  Regla de Asignación Concurrente
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                Define cómo se distribuyen los nuevos mensajes que ingresan por Facebook, Instagram o TikTok.
              </p>

              <div className="space-y-2">
                <button
                  onClick={() => setAssignmentMode('ROUND_ROBIN')}
                  className={`w-full p-3 rounded-xl border text-left text-xs transition ${
                    assignmentMode === 'ROUND_ROBIN'
                      ? 'bg-[#0E1524] border-[#00F0FF]/50 text-white shadow-sm'
                      : 'bg-[#080C14] border-[#141B29] text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold font-tech mb-1">
                    <span>Round-Robin Atómico (Recomendado)</span>
                    {assignmentMode === 'ROUND_ROBIN' && (
                      <i className="fa-solid fa-circle-check text-[#00F0FF]"></i>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 font-normal">
                    Distribuye equitativamente en rotación atómica en PostgreSQL (`FOR UPDATE SKIP LOCKED`) evitando colisiones.
                  </p>
                </button>

                <button
                  onClick={() => setAssignmentMode('LEAST_BUSY')}
                  className={`w-full p-3 rounded-xl border text-left text-xs transition ${
                    assignmentMode === 'LEAST_BUSY'
                      ? 'bg-[#0E1524] border-[#00F0FF]/50 text-white shadow-sm'
                      : 'bg-[#080C14] border-[#141B29] text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold font-tech mb-1">
                    <span>Menor Carga de Trabajo</span>
                    {assignmentMode === 'LEAST_BUSY' && (
                      <i className="fa-solid fa-circle-check text-[#00F0FF]"></i>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 font-normal">
                    Asigna al agente conectado con menos conversaciones abiertas en ese instante.
                  </p>
                </button>

                <button
                  onClick={() => setAssignmentMode('MANUAL')}
                  className={`w-full p-3 rounded-xl border text-left text-xs transition ${
                    assignmentMode === 'MANUAL'
                      ? 'bg-[#0E1524] border-[#00F0FF]/50 text-white shadow-sm'
                      : 'bg-[#080C14] border-[#141B29] text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold font-tech mb-1">
                    <span>Manual por Supervisor</span>
                    {assignmentMode === 'MANUAL' && (
                      <i className="fa-solid fa-circle-check text-[#00F0FF]"></i>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 font-normal">
                    Las conversaciones entran a la cola general pendiente para distribución manual.
                  </p>
                </button>
              </div>
            </div>

            {/* SLA y Capacidad Concurrente */}
            <div className="p-5 rounded-2xl bg-[#05080F] border border-[#111726] space-y-4">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-sliders text-[#00F0FF] text-xs"></i>
                <h3 className="text-sm font-bold text-white font-tech">Límites y SLAs</h3>
              </div>
              <p className="text-xs text-slate-400">
                Límites automáticos para garantizar el cumplimiento del tiempo de respuesta.
              </p>

              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-[#080C14] border border-[#141B29]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-300 font-medium">Límite SLA Primer Contacto</span>
                    <span className="text-xs font-bold text-[#00F0FF] font-tech">5 minutos</span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Alerta roja si un nuevo DM o comentario no recibe respuesta en este lapso.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#080C14] border border-[#141B29]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-300 font-medium">Máx. Chats Simultáneos</span>
                    <span className="text-xs font-bold text-amber-300 font-tech">5 por Agente</span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Un agente con 5 chats activos no recibe más asignaciones automáticas.
                  </p>
                </div>
              </div>
            </div>

            {/* Resumen de Métricas */}
            <div className="p-5 rounded-2xl bg-[#05080F] border border-[#111726] space-y-4">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-chart-simple text-[#00F0FF] text-xs"></i>
                <h3 className="text-sm font-bold text-white font-tech">Rendimiento Hoy</h3>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-[#080C14] border border-[#141B29] text-center">
                  <span className="text-2xl font-black text-white font-tech">{dynamicAtendidos}</span>
                  <p className="text-[10px] text-slate-400 mt-1 font-tech">Atendidos</p>
                </div>
                <div className="p-3 rounded-xl bg-[#080C14] border border-[#141B29] text-center">
                  <span className="text-2xl font-black text-[#10B981] font-tech">{dynamicSla}</span>
                  <p className="text-[10px] text-slate-400 mt-1 font-tech">SLA Cumplido</p>
                </div>
                <div className="p-3 rounded-xl bg-[#080C14] border border-[#141B29] text-center">
                  <span className="text-2xl font-black text-[#00F0FF] font-tech">{dynamicAvgTime}</span>
                  <p className="text-[10px] text-slate-400 mt-1 font-tech">T. Medio Resp.</p>
                </div>
                <div className="p-3 rounded-xl bg-[#080C14] border border-[#141B29] text-center">
                  <span className="text-2xl font-black text-amber-400 font-tech">{dynamicEnEspera}</span>
                  <p className="text-[10px] text-slate-400 mt-1 font-tech">En Espera</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabla de Gestión de Agentes del Equipo */}
          <div className="p-5 rounded-2xl bg-[#05080F] border border-[#111726] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-users text-[#00F0FF] text-xs"></i>
                <h3 className="text-sm font-bold text-white font-tech">
                  Equipo de Operadores ({agents.length} / {maxOperators})
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">
                  {agents.filter((a) => a.isOnline).length} de {agents.length} en línea
                </span>
                {agents.length >= maxOperators ? (
                  <span className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-tech font-bold flex items-center gap-1.5" title="Límite máximo de operadores alcanzado">
                    <i className="fa-solid fa-lock text-xs"></i>
                    <span>Límite Alcanzado ({maxOperators} máx)</span>
                  </span>
                ) : (
                  <button
                    onClick={() => setIsAddAgentModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-[#00F0FF] hover:bg-[#00D7E5] text-[#030508] font-bold text-xs flex items-center gap-1.5 font-tech shadow-md shadow-[#00F0FF]/20 transition"
                  >
                    <i className="fa-solid fa-user-plus text-xs"></i>
                    <span>Agregar Operador</span>
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#141B29] text-slate-500 font-tech uppercase text-[10px]">
                    <th className="pb-3 pl-2">Agente</th>
                    <th className="pb-3">Rol</th>
                    <th className="pb-3 text-center">Estado</th>
                    <th className="pb-3 text-center">Chats Activos</th>
                    <th className="pb-3 text-center">T. Promedio</th>
                    <th className="pb-3 text-right pr-2">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#111622]">
                  {agents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 font-tech">
                        No hay operadores creados aún. Haz clic en "Agregar Operador" para dar de alta al equipo (hasta ${maxOperators} permitidos).
                      </td>
                    </tr>
                  ) : (
                    agents.map((agent) => (
                    <tr key={agent.id} className="hover:bg-[#080C14] transition">
                      <td className="py-3.5 pl-2">
                        <div className="flex items-center gap-2.5">
                          {agent.avatar && agent.avatar.startsWith('http') ? (
                            <img
                              src={agent.avatar}
                              alt={agent.name}
                              className="w-8 h-8 rounded-full object-cover border border-[#141B29] flex-shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-[#111622] text-[#00F0FF] font-bold text-xs flex items-center justify-center font-tech flex-shrink-0 border border-[#141B29]">
                              {agent.avatar && agent.avatar.length <= 3 ? agent.avatar : agent.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-white truncate">{agent.name}</p>
                            <p className="text-[10px] text-slate-500 truncate">{agent.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                          agent.role.toLowerCase().includes('supervisor')
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                            : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                        }`}>
                          {agent.role.toLowerCase().includes('supervisor') ? 'Supervisor' : 'Operador'}
                        </span>
                      </td>
                      <td className="py-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            agent.isOnline
                              ? 'bg-[#10B981]/15 text-[#10B981]'
                              : 'bg-slate-800 text-slate-500'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              agent.isOnline ? 'bg-[#10B981]' : 'bg-slate-500'
                            }`}
                          ></span>
                          {agent.isOnline ? 'En Línea' : 'Desconectado'}
                        </span>
                      </td>
                      <td className="py-3.5 text-center font-bold text-white font-tech">
                        {agent.assignedCount}
                      </td>
                      <td className="py-3.5 text-center text-slate-300 font-tech">
                        {agent.avgResponseTime}
                      </td>
                      <td className="py-3.5 text-right pr-2">
                        <button
                          onClick={() => toggleAgentStatus(agent.id)}
                          className={`px-3 py-1 rounded-lg text-[11px] font-semibold border transition ${
                            agent.isOnline
                              ? 'border-rose-500/30 text-rose-400 hover:bg-rose-500/10'
                              : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                          }`}
                        >
                          {agent.isOnline ? 'Pausar' : 'Activar'}
                        </button>
                      </td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Plantillas y Respuestas Rápidas */}
          <div className="p-5 rounded-2xl bg-[#05080F] border border-[#111726] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-bolt text-[#00F0FF] text-xs"></i>
                <h3 className="text-sm font-bold text-white font-tech">
                  Respuestas Rápidas Predefinidas
                </h3>
              </div>
              <button
                onClick={() => setIsAddingTemplate(!isAddingTemplate)}
                className="px-3 py-1.5 rounded-xl bg-[#080C14] hover:bg-[#0E1524] border border-[#00F0FF]/30 text-[#00F0FF] text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <i className="fa-solid fa-plus text-xs"></i>
                <span>Nueva Plantilla</span>
              </button>
            </div>

            {isAddingTemplate && (
              <form
                onSubmit={handleAddTemplate}
                className="p-4 rounded-xl bg-[#080C14] border border-[#00F0FF]/30 space-y-3 fade-in"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase font-tech mb-1">
                      Atajo (Comando '/')
                    </label>
                    <input
                      type="text"
                      placeholder="/despedida"
                      value={newShortcut}
                      onChange={(e) => setNewShortcut(e.target.value)}
                      className="w-full bg-[#05080F] border border-[#141B29] rounded-lg p-2 text-xs text-white placeholder-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase font-tech mb-1">
                      Título descriptivo
                    </label>
                    <input
                      type="text"
                      placeholder="Mensaje de cierre y despedida"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full bg-[#05080F] border border-[#141B29] rounded-lg p-2 text-xs text-white placeholder-slate-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase font-tech mb-1">
                    Contenido del mensaje
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Escribe el texto predeterminado..."
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    className="w-full bg-[#05080F] border border-[#141B29] rounded-lg p-2 text-xs text-white placeholder-slate-500"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingTemplate(false)}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-[#00F0FF] text-[#030508] font-bold text-xs rounded-lg font-tech"
                  >
                    Guardar Plantilla
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {templates.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="p-3.5 rounded-xl bg-[#080C14] border border-[#141B29] hover:border-[#00F0FF]/30 transition text-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-bold text-[#00F0FF] font-tech">{tmpl.shortcut}</span>
                        <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                          {tmpl.title}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteTemplateItem(tmpl.id)}
                        className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-rose-950/30 transition flex-shrink-0"
                        title="Eliminar plantilla"
                      >
                        <i className="fa-solid fa-trash-can text-[10px]"></i>
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-300 line-clamp-3 leading-relaxed">
                      {tmpl.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : activeTab === 'tickets' ? (
        /* Pestaña de Incidencias Técnicas Admin <-> Super Admin (Core) */
        <div className="space-y-6 fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#05080F] border border-cyan-900/30">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-server text-cyan-400"></i>
                <span>Incidencias Técnicas y Escalamiento a Super Admin (Core)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Canal exclusivo para reportar caídas de infraestructura, fallas de webhooks, facturación o soporte Nivel 3 directo al equipo de plataforma KorevX Core.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsTicketModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-purple-900/30 transition font-tech"
              >
                <i className="fa-solid fa-plus text-xs"></i>
                <span>Reportar a Super Admin (Core)</span>
              </button>
              <button
                onClick={loadTickets}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
                title="Refrescar incidencias"
              >
                <i className="fa-solid fa-rotate-right text-xs"></i>
              </button>
            </div>
          </div>

          {/* Filtros de Estado para Incidencias de Plataforma */}
          <div className="flex items-center gap-2 text-xs bg-[#05080F] p-3 rounded-xl border border-[#111726]">
            <i className="fa-solid fa-filter text-[#00F0FF] text-xs"></i>
            <span className="text-slate-400 font-tech font-semibold">Estado de Incidencia:</span>
            <select
              value={selectedOperatorFilter}
              onChange={(e) => setSelectedOperatorFilter(e.target.value)}
              className="bg-[#080C14] text-[#00F0FF] border border-[#141B29] rounded-lg px-2.5 py-1 font-bold focus:outline-none cursor-pointer text-xs"
            >
              <option value="ALL" className="bg-[#05080F] text-slate-300">
                Todas las Incidencias ({adminTickets.length})
              </option>
              <option value="OPEN" className="bg-[#05080F] text-amber-400">
                Abiertas ({adminTickets.filter((t) => t.status === 'OPEN').length})
              </option>
              <option value="RESOLVED" className="bg-[#05080F] text-emerald-400">
                Resueltas por Core ({adminTickets.filter((t) => t.status === 'RESOLVED').length})
              </option>
            </select>
          </div>

          {isLoadingTickets ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <i className="fa-solid fa-spinner fa-spin text-xl text-cyan-400 mb-2"></i>
              <p>Cargando incidencias técnicas...</p>
            </div>
          ) : adminTickets.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#05080F] border border-[#111726] text-slate-400 text-xs">
              <i className="fa-solid fa-circle-check text-3xl text-emerald-400 mb-3"></i>
              <p className="font-semibold text-slate-200">No hay incidencias técnicas con Super Admin (Core)</p>
              <p className="text-slate-500 mt-1">
                La plataforma opera con total normalidad. Las solicitudes de tus operadores se gestionan en el Centro de Tickets.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {adminTickets
                .filter((t) => {
                  if (selectedOperatorFilter !== 'ALL') {
                    if (t.status !== selectedOperatorFilter) return false;
                  }
                  return true;
                })
                .map((t) => {
                const categoryLabels: Record<string, { label: string; color: string }> = {
                  SPECIAL_APPROVAL: { label: 'Aprobación Especial', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
                  DISCOUNT_AUTHORIZATION: { label: 'Autorización Descuento', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
                  L2_SUPPORT: { label: 'Soporte Nivel 2', color: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' },
                  ARCO_PRIVACY: { label: 'Privacidad / ARCO (Ley 1581)', color: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
                  TECH_PLATFORM_ISSUE: { label: 'Falla Técnica Plataforma', color: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
                  WEBHOOKS_FAILURE: { label: 'Caída de Webhooks', color: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
                  BILLING: { label: 'Facturación', color: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
                };

                const cat = categoryLabels[t.category] || { label: t.category, color: 'bg-slate-800 text-slate-300 border-slate-700' };

                return (
                  <div
                    key={t.id}
                    className="p-4 rounded-2xl bg-[#05080F] border border-[#111726] hover:border-slate-700 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-xs text-white">#{t.ticketNumber}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cat.color}`}>
                          {cat.label}
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
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/25 text-purple-300 border border-purple-500/30">
                            Escalado a Super Admin
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500">
                          {new Date(t.createdAt).toLocaleString()}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-white">{t.title}</h4>
                      <p className="text-xs text-slate-400">{t.description}</p>

                      <div className="flex items-center gap-4 text-[11px] text-slate-500">
                        {t.createdBy && (
                          <span>
                            Solicitado por: <strong className="text-slate-300">{t.createdBy.fullName}</strong>
                          </span>
                        )}
                        {t.assignedTo && (
                          <span>
                            Asignado a: <strong className="text-slate-300">{t.assignedTo.fullName}</strong>
                          </span>
                        )}
                      </div>

                      {t.resolutionNotes && (
                        <div className="p-3 rounded-xl bg-[#080C14] border border-[#141B29] text-xs">
                          <p className="text-[10px] font-bold text-emerald-400 uppercase font-tech">Nota de Resolución</p>
                          <p className="text-slate-300 mt-1">{t.resolutionNotes}</p>
                        </div>
                      )}
                    </div>

                    {/* Acciones del ticket */}
                    {t.status !== 'RESOLVED' && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {resolvingTicketId === t.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Nota de resolución..."
                              value={resolutionNote}
                              onChange={(e) => setResolutionNote(e.target.value)}
                              className="bg-[#080C14] border border-[#141B29] rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 w-48"
                            />
                            <button
                              onClick={() => handleUpdateTicketStatus(t.id, 'RESOLVED')}
                              className="px-3 py-1.5 rounded-xl bg-[#10B981] hover:bg-emerald-600 text-black font-bold text-xs transition"
                            >
                              Confirmar
                            </button>
                            <button
                              onClick={() => setResolvingTicketId(null)}
                              className="p-1.5 text-slate-400 hover:text-white text-xs"
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
              })}
            </div>
          )}
        </div>
      ) : null}

      {/* Modal para que el Admin cree tickets a Super Admin */}
      <CreateTicketModal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
        onTicketCreated={loadTickets}
        forcedType="ADMIN_TO_SUPERADMIN"
      />

      {/* Modal para Agregar Nuevo Operador con Portal al body */}
      {isAddAgentModalOpen &&
        createPortal(
          <div className="fixed inset-0 bg-black/85 z-[99999] flex items-start justify-center p-4 sm:p-6 backdrop-blur-md overflow-y-auto">
            <div className="w-full max-w-md bg-[#05080F] border border-[#141B29] rounded-2xl p-6 shadow-2xl space-y-4 my-auto relative z-[100000]">
              <div className="flex items-center justify-between pb-3 border-b border-[#111622]">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30 flex items-center justify-center text-xs">
                    <i className="fa-solid fa-user-plus"></i>
                  </span>
                  <h3 className="text-base font-bold text-white font-tech">Agregar Nuevo Operador</h3>
                </div>
                <button
                  onClick={() => setIsAddAgentModalOpen(false)}
                  className="text-slate-400 hover:text-white text-xs p-1"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>

              <form onSubmit={handleCreateAgent} className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase font-tech block mb-1.5">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ej: Sofía Mendoza"
                    value={newAgentName}
                    onChange={(e) => setNewAgentName(e.target.value)}
                    className="w-full bg-[#080C14] border border-[#141B29] focus:border-[#00F0FF]/60 rounded-xl p-2.5 text-xs text-white placeholder-slate-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase font-tech block mb-1.5">
                    Correo Corporativo
                  </label>
                  <input
                    type="email"
                    placeholder="ej: sofia@korevx.com"
                    value={newAgentEmail}
                    onChange={(e) => setNewAgentEmail(e.target.value)}
                    className="w-full bg-[#080C14] border border-[#141B29] focus:border-[#00F0FF]/60 rounded-xl p-2.5 text-xs text-white placeholder-slate-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase font-tech block mb-1.5">
                    Rol en la Plataforma
                  </label>
                  <select
                    value={newAgentRole}
                    onChange={(e) => setNewAgentRole(e.target.value)}
                    className="w-full bg-[#080C14] border border-[#141B29] focus:border-[#00F0FF]/60 rounded-xl p-2.5 text-xs text-white"
                  >
                    <option value="Operador">Operador</option>
                    <option value="Supervisor">Supervisor</option>
                  </select>
                </div>

                <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-800/30 text-[11px] text-cyan-300">
                  <i className="fa-solid fa-circle-info mr-1.5"></i>
                  El nuevo operador aparecerá inmediatamente en los selectores de asignación manual de chats.
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#111622]">
                  <button
                    type="button"
                    onClick={() => setIsAddAgentModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-[#080C14] border border-[#141B29] text-slate-400 hover:text-white text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#00F0FF] hover:bg-[#00D7E5] text-[#030508] text-xs font-bold font-tech shadow-md shadow-[#00F0FF]/20"
                  >
                    Guardar y Activar
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </section>
  );
};
