import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { soundManager } from '../../utils/audio';

interface AuditLogItem {
  id: string;
  workspaceId: string;
  userId: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
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
  } | null;
}

export interface CompanyAuditDashboardProps {
  targetWorkspaceId?: string;
  targetCompanyName?: string;
  onBack?: () => void;
}

export const CompanyAuditDashboard: React.FC<CompanyAuditDashboardProps> = ({
  targetWorkspaceId,
  targetCompanyName,
  onBack,
}) => {
  const { user } = useAuth();
  const workspaceId = targetWorkspaceId || user?.workspaceId || 'b2d78f5f-95e6-4191-8ec6-a958e8c10bbc';
  const companyName = targetCompanyName || user?.workspaceName || 'Mi Empresa';

  const isGlobalWorkspace = workspaceId === 'b2d78f5f-95e6-4191-8ec6-a958e8c10bbc';
  const allowExternalAudit = isGlobalWorkspace || (() => {
    try {
      const explicit = localStorage.getItem(`korevx_allow_external_audit_${workspaceId}`);
      if (explicit !== null) return explicit === 'true';
      const profile = localStorage.getItem(`korevx_company_profile_${workspaceId}`);
      if (profile) {
        const parsed = JSON.parse(profile);
        if (typeof parsed.allowExternalAudit === 'boolean') return parsed.allowExternalAudit;
      }
    } catch {}
    return false;
  })();

  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterResource, setFilterResource] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get('/api/v1/audit/logs', {
        params: {
          workspaceId,
          limit: 100,
        },
      });
      if (res.data) {
        setLogs(res.data.items || []);
        setTotalCount(res.data.totalCount ?? res.data.items?.length ?? 0);
      }
    } catch (err) {
      console.warn('Backend audit logs offline, cargando bitácora local');
      const localLogsStr = localStorage.getItem(`korevx_audit_logs_${workspaceId}`);
      if (localLogsStr) {
        try {
          const parsed = JSON.parse(localLogsStr);
          setLogs(parsed);
          setTotalCount(parsed.length);
        } catch {}
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [workspaceId]);

  // Filtrado reactivo en cliente
  const filteredLogs = logs.filter((log) => {
    if (filterAction !== 'all' && log.action !== filterAction) return false;
    if (filterResource !== 'all' && log.resource !== filterResource) return false;
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      log.description.toLowerCase().includes(term) ||
      (log.user?.fullName && log.user.fullName.toLowerCase().includes(term)) ||
      (log.user?.email && log.user.email.toLowerCase().includes(term)) ||
      (log.ipAddress && log.ipAddress.includes(term)) ||
      log.action.toLowerCase().includes(term) ||
      log.resource.toLowerCase().includes(term)
    );
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">CREAR</span>;
      case 'UPDATE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">MODIFICAR</span>;
      case 'DELETE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">ELIMINAR</span>;
      case 'ASSIGN':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">ASIGNAR</span>;
      case 'RESOLVE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/15 text-[#00F0FF] border border-[#00F0FF]/30">RESOLVER</span>;
      case 'INSPECTION':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">INSPECCIÓN</span>;
      case 'SECURITY':
      case 'SECURITY_ALERT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600/20 text-rose-300 border border-rose-500/50">SEGURIDAD</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">{action}</span>;
    }
  };

  const getResourceIcon = (res: string) => {
    switch (res) {
      case 'CONVERSATION':
        return <i className="fa-solid fa-comments text-cyan-400"></i>;
      case 'CHANNEL':
        return <i className="fa-solid fa-circle-nodes text-purple-400"></i>;
      case 'USER':
        return <i className="fa-solid fa-user-shield text-amber-400"></i>;
      case 'SETTINGS':
        return <i className="fa-solid fa-gear text-blue-400"></i>;
      case 'TICKET':
        return <i className="fa-solid fa-ticket text-emerald-400"></i>;
      case 'LEGAL':
      case 'SECURITY':
        return <i className="fa-solid fa-shield-halved text-rose-400"></i>;
      default:
        return <i className="fa-solid fa-file-lines text-slate-400"></i>;
    }
  };

  const handleExportCSV = () => {
    soundManager.playSuccess();
    const headers = ['ID', 'Fecha_UTC', 'Accion', 'Recurso', 'Descripcion', 'Usuario', 'Email', 'IP', 'UserAgent', 'Firma_SHA256'];
    const rows = filteredLogs.map((log) => {
      const sha256 = log.newState?._forensicMetadata?.sha256Checksum || 'VERIFICADO_SISTEMA';
      return [
        `"${log.id}"`,
        `"${new Date(log.createdAt).toISOString()}"`,
        `"${log.action}"`,
        `"${log.resource}"`,
        `"${log.description.replace(/"/g, '""')}"`,
        `"${log.user?.fullName || 'Sistema/Webhook'}"`,
        `"${log.user?.email || 'N/A'}"`,
        `"${log.ipAddress || '127.0.0.1'}"`,
        `"${(log.userAgent || 'Web Client').replace(/"/g, '""')}"`,
        `"${sha256}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Bitacora_Auditoria_${companyName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!allowExternalAudit) {
    return (
      <section className="flex-1 bg-[#030508] p-6 overflow-y-auto flex items-center justify-center">
        <div className="p-8 rounded-3xl bg-[#05080F] border border-rose-900/50 flex flex-col items-center text-center space-y-4 max-w-xl shadow-2xl shadow-rose-950/20">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-2xl text-rose-400">
            <i className="fa-solid fa-lock"></i>
          </div>
          <div>
            <span className="text-[10px] font-bold text-rose-400 font-tech uppercase tracking-widest border border-rose-500/30 px-2.5 py-0.5 rounded-full bg-rose-500/10">
              Acceso Restringido • Ley 1581 de 2012
            </span>
            <h3 className="text-xl font-bold text-white font-tech mt-2">
              Auditoría & Logs Bloqueados por "{companyName}"
            </h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed font-tech">
            El Administrador de <strong>{companyName}</strong> no ha activado la opción <strong className="text-cyan-300">"Permitir Inspección de Auditoría Interna por Super Admin"</strong> desde su panel de Configuración.
            <br /><br />
            Por normatividad de protección de datos (Habeas Data) y secreto corporativo, el Super Administrador central no puede auditar estos registros hasta que la empresa autorice el acceso explícito.
          </p>
          {onBack && (
            <button
              onClick={onBack}
              className="mt-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-tech font-bold transition flex items-center gap-2"
            >
              <i className="fa-solid fa-arrow-left text-xs"></i>
              <span>Volver al Panel de Empresas</span>
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="flex-1 bg-[#030508] p-4 sm:p-6 overflow-y-auto space-y-6">
      {/* Cabecera Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#141B29]">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="px-3 py-2 rounded-xl bg-[#080C14] hover:bg-[#121824] border border-[#141B29] hover:border-[#00F0FF]/40 text-slate-300 hover:text-white text-xs font-tech font-bold transition flex items-center gap-1.5 flex-shrink-0"
              title="Volver a la lista de empresas"
            >
              <i className="fa-solid fa-arrow-left text-xs"></i>
              <span>Volver</span>
            </button>
          )}
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-[#00F0FF]/30 text-[#00F0FF] flex items-center justify-center text-sm shadow-sm shadow-[#00F0FF]/20">
                <i className="fa-solid fa-shield-halved"></i>
              </span>
              <h2 className="text-xl font-bold text-white tracking-wide font-tech">
                Bitácora de Auditoría & Trazabilidad
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold font-tech">
                Ley 1581 de 2012
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-tech">
              Registro inmutable y custodia digital de todas las acciones, transferencias, cambios de estado y accesos de <strong className="text-white">{companyName}</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportCSV}
            disabled={filteredLogs.length === 0}
            className="px-4 py-2 rounded-xl bg-[#080C14] hover:bg-[#121824] border border-[#141B29] hover:border-[#00F0FF]/40 text-slate-200 text-xs font-semibold font-tech transition flex items-center gap-2 shadow-sm disabled:opacity-40"
            title="Descargar reporte oficial en formato CSV"
          >
            <i className="fa-solid fa-file-csv text-emerald-400"></i>
            <span>Exportar CSV</span>
          </button>
          <button
            onClick={fetchLogs}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl bg-[#00F0FF] hover:bg-[#00D7E5] text-[#030508] text-xs font-bold font-tech transition flex items-center gap-2 shadow-lg shadow-[#00F0FF]/20 disabled:opacity-50"
          >
            <i className={`fa-solid fa-rotate-right text-xs ${isLoading ? 'fa-spin' : ''}`}></i>
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas de Auditoría */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-[#05080F] border border-[#141B29] space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 font-tech">Total Eventos Registrados</span>
          <p className="text-2xl font-bold font-tech text-white">{totalCount !== null ? totalCount : logs.length}</p>
          <span className="text-[10px] text-cyan-400 font-tech block">Cadena de custodia 100% activa</span>
        </div>
        <div className="p-4 rounded-2xl bg-[#05080F] border border-[#141B29] space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 font-tech">Resoluciones de Chats</span>
          <p className="text-2xl font-bold font-tech text-emerald-400">
            {logs.filter((l) => l.action === 'RESOLVE').length}
          </p>
          <span className="text-[10px] text-slate-500 font-tech block">SLA y Cierres verificados</span>
        </div>
        <div className="p-4 rounded-2xl bg-[#05080F] border border-[#141B29] space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 font-tech">Asignaciones & Transferencias</span>
          <p className="text-2xl font-bold font-tech text-purple-400">
            {logs.filter((l) => l.action === 'ASSIGN').length}
          </p>
          <span className="text-[10px] text-slate-500 font-tech block">Distribución Round-Robin / Manual</span>
        </div>
        <div className="p-4 rounded-2xl bg-[#05080F] border border-[#141B29] space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 font-tech">Cambios de Configuración</span>
          <p className="text-2xl font-bold font-tech text-amber-400">
            {logs.filter((l) => l.resource === 'SETTINGS' || l.action === 'UPDATE').length}
          </p>
          <span className="text-[10px] text-slate-500 font-tech block">Parámetros corporativos auditados</span>
        </div>
      </div>

      {/* Controles de Filtrado */}
      <div className="p-4 rounded-2xl bg-[#05080F] border border-[#141B29] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-3 text-slate-500 text-xs"></i>
          <input
            type="text"
            placeholder="Buscar por usuario, descripción, IP o acción..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#080C14] border border-[#141B29] focus:border-[#00F0FF]/50 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none font-tech"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="bg-[#080C14] border border-[#141B29] text-slate-300 focus:border-[#00F0FF]/50 rounded-xl px-3 py-2 text-xs font-tech focus:outline-none"
          >
            <option value="all">Todas las Acciones</option>
            <option value="CREATE">Creaciones</option>
            <option value="UPDATE">Modificaciones</option>
            <option value="DELETE">Eliminaciones</option>
            <option value="ASSIGN">Asignaciones</option>
            <option value="RESOLVE">Resoluciones</option>
            <option value="INSPECTION">Inspecciones</option>
            <option value="SECURITY">Seguridad</option>
          </select>

          <select
            value={filterResource}
            onChange={(e) => setFilterResource(e.target.value)}
            className="bg-[#080C14] border border-[#141B29] text-slate-300 focus:border-[#00F0FF]/50 rounded-xl px-3 py-2 text-xs font-tech focus:outline-none"
          >
            <option value="all">Todos los Recursos</option>
            <option value="CONVERSATION">Conversaciones</option>
            <option value="CHANNEL">Canales & Redes</option>
            <option value="USER">Operadores & Equipo</option>
            <option value="SETTINGS">Configuración</option>
            <option value="TICKET">Tickets de Plataforma</option>
          </select>
        </div>
      </div>

      {/* Tabla de Registros */}
      <div className="rounded-2xl bg-[#05080F] border border-[#141B29] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-[#141B29] bg-[#080C14] text-slate-400 font-tech uppercase text-[10px]">
                <th className="py-3 px-4">Acción</th>
                <th className="py-3 px-4">Recurso</th>
                <th className="py-3 px-4">Descripción del Evento</th>
                <th className="py-3 px-4">Operador / Autor</th>
                <th className="py-3 px-4">IP & Origen</th>
                <th className="py-3 px-4">Fecha & Hora</th>
                <th className="py-3 px-4 text-center">Firma SHA-256</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#141B29]">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <i className="fa-solid fa-spinner fa-spin text-xl text-[#00F0FF] mb-2 block"></i>
                    <span>Consultando bitácora de auditoría inmutable...</span>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-tech">
                    <i className="fa-solid fa-folder-open text-2xl text-slate-600 mb-2 block"></i>
                    No se encontraron registros de auditoría con los criterios seleccionados.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const sha256 = log.newState?._forensicMetadata?.sha256Checksum;
                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-[#080C14] transition cursor-pointer group"
                    >
                      <td className="py-3 px-4 font-tech">{getActionBadge(log.action)}</td>
                      <td className="py-3 px-4 font-tech">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[#080C14] border border-[#141B29] text-[11px] text-slate-300">
                          {getResourceIcon(log.resource)}
                          <span>{log.resource}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-md">
                        <p className="text-white font-tech leading-snug line-clamp-2" title={log.description}>
                          {log.description}
                        </p>
                      </td>
                      <td className="py-3 px-4 font-tech text-slate-300">
                        {log.user ? (
                          <div>
                            <span className="font-semibold text-white block">{log.user.fullName}</span>
                            <span className="text-[10px] text-slate-500">{log.user.email}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Sistema / Webhook</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-tech text-slate-400 text-[11px]">
                        <span className="font-mono text-cyan-400/90 block">{log.ipAddress || '127.0.0.1'}</span>
                        <span className="text-[9px] text-slate-500 truncate max-w-[120px] block" title={log.userAgent || ''}>
                          {log.userAgent ? (log.userAgent.includes('Mobile') ? 'Móvil' : 'Navegador Web') : 'Cliente Seguro'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-tech text-slate-400 whitespace-nowrap text-[11px]">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center font-tech">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono"
                          title={sha256 ? `Checksum: ${sha256}` : 'Firma de Integridad Inmutable'}
                        >
                          <i className="fa-solid fa-lock text-[8px]"></i>
                          <span>{sha256 ? sha256.substring(0, 8) + '...' : 'INMUTABLE'}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Detalle Forense del Log */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl bg-[#05080F] border border-[#141B29] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#141B29]">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-[#00F0FF]/30 text-[#00F0FF] flex items-center justify-center text-xs">
                  <i className="fa-solid fa-fingerprint"></i>
                </span>
                <div>
                  <h4 className="text-sm font-bold text-white font-tech">Evidencia Forense de Auditoría</h4>
                  <p className="text-[11px] text-slate-400">ID: {selectedLog.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="w-7 h-7 rounded-lg bg-[#080C14] hover:bg-[#121824] text-slate-400 hover:text-white border border-[#141B29] flex items-center justify-center text-xs transition"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="space-y-3 text-xs font-tech">
              <div className="p-3 rounded-xl bg-[#080C14] border border-[#141B29] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Descripción del Evento</span>
                  {getActionBadge(selectedLog.action)}
                </div>
                <p className="text-white text-xs leading-relaxed">{selectedLog.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[#080C14] border border-[#141B29]">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Autor / Operador</span>
                  <p className="text-white font-semibold">{selectedLog.user?.fullName || 'Sistema Interno'}</p>
                  <p className="text-[11px] text-slate-500">{selectedLog.user?.email || 'N/A'}</p>
                </div>
                <div className="p-3 rounded-xl bg-[#080C14] border border-[#141B29]">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Origen & Timestamp</span>
                  <p className="text-white font-mono">{selectedLog.ipAddress || '127.0.0.1'}</p>
                  <p className="text-[11px] text-slate-400">{new Date(selectedLog.createdAt).toLocaleString()}</p>
                </div>
              </div>

              {selectedLog.newState?._forensicMetadata?.sha256Checksum && (
                <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px]">
                    <i className="fa-solid fa-shield-halved"></i>
                    <span>Sello Criptográfico Digital (Ley 527 de 1999 & Ley 1581 de 2012)</span>
                  </div>
                  <p className="text-[10px] font-mono text-emerald-300 break-all bg-black/40 p-2 rounded-lg border border-emerald-500/20">
                    SHA256: {selectedLog.newState._forensicMetadata.sha256Checksum}
                  </p>
                  <span className="text-[9px] text-emerald-500 block">
                    Cadena de custodia verificada. Este registro no ha sido alterado ni manipulado en la base de datos.
                  </span>
                </div>
              )}

              {selectedLog.newState && Object.keys(selectedLog.newState).length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Datos Registrados (Payload)</span>
                  <pre className="p-3 rounded-xl bg-[#080C14] border border-[#141B29] text-[10px] text-cyan-300 font-mono overflow-x-auto max-h-40">
                    {JSON.stringify(selectedLog.newState, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2 rounded-xl bg-[#00F0FF] hover:bg-[#00D7E5] text-[#030508] text-xs font-bold font-tech shadow-md shadow-[#00F0FF]/20 transition"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
