import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ChannelAccount, PlatformType, InteractionType } from '../types';
import { api } from '../services/api';

interface ChannelsManagerProps {
  channels: ChannelAccount[];
  onChannelRefresh: () => void;
  onToggleChannelStatus?: (channelId: string) => void;
  onAddChannel?: (newChannel: ChannelAccount) => void;
  onDeleteChannel?: (channelId: string) => void;
}

export const ChannelsManager: React.FC<ChannelsManagerProps> = ({
  channels,
  onChannelRefresh,
  onToggleChannelStatus,
  onAddChannel,
  onDeleteChannel,
}) => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedPlatform, setSimulatedPlatform] = useState<PlatformType>('INSTAGRAM');
  const [simulatedType, setSimulatedType] = useState<InteractionType>('DIRECT_MESSAGE');
  const [simulatedName, setSimulatedName] = useState('Mariana Gómez');
  const [simulatedContent, setSimulatedContent] = useState('¡Hola KorevX! Me interesa integrar su software para mi negocio.');
  const [simSuccess, setSimSuccess] = useState(false);

  // Modal para conectar nuevo canal
  const [isAddChannelModalOpen, setIsAddChannelModalOpen] = useState(false);
  const [newPlatform, setNewPlatform] = useState<PlatformType>('WHATSAPP');
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountHandle, setNewAccountHandle] = useState('');

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSimulating(true);
    setSimSuccess(false);
    try {
      await api.simulateWebhookEvent({
        platform: simulatedPlatform,
        interactionType: simulatedType,
        senderName: simulatedName,
        content: simulatedContent,
        postTitle: simulatedType === 'POST_COMMENT' ? 'Lanzamiento Nueva Versión KorevX 2026' : undefined,
      });
      setSimSuccess(true);
      setTimeout(() => setSimSuccess(false), 3000);
      onChannelRefresh();
    } catch (err) {
      console.error('Error simulando evento:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleCreateChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountName.trim()) return;

    const createdChannel: ChannelAccount = {
      id: `chan-${newPlatform.toLowerCase()}-${Date.now()}`,
      workspaceId: 'b2d78f5f-95e6-4191-8ec6-a958e8c10bbc',
      platform: newPlatform,
      accountName: newAccountName.trim(),
      accountHandle: newAccountHandle.trim() || `@${newAccountName.toLowerCase().replace(/\s+/g, '')}`,
      isActive: true,
      connectedAt: new Date().toISOString(),
    };

    if (onAddChannel) {
      onAddChannel(createdChannel);
    }
    setNewAccountName('');
    setNewAccountHandle('');
    setIsAddChannelModalOpen(false);
    onChannelRefresh();
  };

  const getPlatformIcon = (plt: PlatformType) => {
    switch (plt) {
      case 'INSTAGRAM':
        return (
          <span className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white text-lg shadow-sm shadow-rose-500/20">
            <i className="fa-brands fa-instagram"></i>
          </span>
        );
      case 'FACEBOOK':
        return (
          <span className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#1877F2] text-white text-lg shadow-sm shadow-blue-500/20">
            <i className="fa-brands fa-facebook-f"></i>
          </span>
        );
      case 'TIKTOK':
        return (
          <span className="w-10 h-10 rounded-xl bg-black border border-slate-700 flex items-center justify-center text-white text-lg shadow-sm">
            <i className="fa-brands fa-tiktok text-cyan-400"></i>
          </span>
        );
      case 'WHATSAPP':
        return (
          <span className="w-10 h-10 rounded-xl bg-[#25D366] text-white flex items-center justify-center text-lg shadow-sm shadow-emerald-500/20">
            <i className="fa-brands fa-whatsapp"></i>
          </span>
        );
      case 'TWITTER_X':
        return (
          <span className="w-10 h-10 rounded-xl bg-black border border-slate-700 text-white flex items-center justify-center text-base shadow-sm">
            <i className="fa-brands fa-x-twitter"></i>
          </span>
        );
      default:
        return (
          <span className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center text-base">
            <i className="fa-solid fa-satellite-dish"></i>
          </span>
        );
    }
  };

  return (
    <section className="w-full h-full overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#030508] fade-in space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#111622]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30 flex items-center justify-center text-sm">
              <i className="fa-solid fa-circle-nodes"></i>
            </span>
            <h2 className="text-xl font-bold text-white font-tech">Canales y Redes Sociales Vinculadas</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Gestiona las conexiones oficiales. Al desconectar un canal, el operador no podrá ver ni responder sus mensajes.
          </p>
        </div>

        <button
          onClick={() => setIsAddChannelModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-[#00F0FF] hover:bg-[#00D7E5] text-[#030508] font-bold text-xs flex items-center gap-2 font-tech shadow-md shadow-[#00F0FF]/20 transition"
        >
          <i className="fa-solid fa-plus text-xs"></i>
          <span>Conectar Nueva Red Social</span>
        </button>
      </div>

      {/* Grid de Canales Oficiales Activos */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {channels.map((chan) => (
          <div
            key={chan.id}
            className={`p-5 rounded-2xl bg-[#05080F] border transition flex flex-col justify-between ${
              chan.isActive ? 'border-[#111726] hover:border-slate-700' : 'border-rose-950/40 opacity-75'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                {getPlatformIcon(chan.platform)}
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1.5 font-tech ${
                    chan.isActive
                      ? 'bg-emerald-500/15 text-[#10B981] border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      chan.isActive ? 'bg-[#10B981]' : 'bg-rose-500'
                    }`}
                  ></span>
                  {chan.isActive ? 'Conectado (Online)' : 'Desconectado / Pausado'}
                </span>
              </div>

              <h3 className="text-sm font-bold text-white font-tech">{chan.accountName}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{chan.accountHandle || '@cuenta'}</p>
              <p className="text-[11px] text-slate-500 mt-2">
                {chan.isActive
                  ? 'Sincronización en vivo activa. Los operadores reciben y responden mensajes.'
                  : 'Canal pausado. Oculto para operadores para evitar respuestas salientes.'}
              </p>
            </div>

            <div className="pt-4 mt-4 border-t border-[#111622] flex items-center justify-between text-xs">
              <span className="text-slate-500 font-tech text-[11px]">
                {chan.connectedAt ? `Alta: ${new Date(chan.connectedAt).toLocaleDateString()}` : 'API Oficial'}
              </span>

              <div className="flex items-center gap-2">
                {onToggleChannelStatus && (
                  <button
                    onClick={() => onToggleChannelStatus(chan.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                      chan.isActive
                        ? 'bg-rose-950/30 hover:bg-rose-900/40 text-rose-300 border border-rose-800/40'
                        : 'bg-emerald-950/30 hover:bg-emerald-900/40 text-emerald-300 border border-emerald-800/40'
                    }`}
                  >
                    <i className={`fa-solid ${chan.isActive ? 'fa-plug-circle-xmark' : 'fa-plug-circle-check'} text-xs`}></i>
                    <span>{chan.isActive ? 'Desconectar' : 'Reconectar'}</span>
                  </button>
                )}

                {onDeleteChannel && (
                  <button
                    onClick={() => {
                      if (window.confirm(`¿Estás seguro de eliminar permanentemente el canal "${chan.accountName}"? Esta acción quedará registrada en el log de auditoría.`)) {
                        onDeleteChannel(chan.id);
                      }
                    }}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/50 transition"
                    title="Eliminar canal definitivamente"
                  >
                    <i className="fa-solid fa-trash-can text-xs"></i>
                    <span>Borrar</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Simulador de Pruebas de Webhooks en Vivo */}
      <div className="p-6 rounded-2xl bg-[#05080F] border border-[#00F0FF]/30 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30 flex items-center justify-center text-xs">
              <i className="fa-solid fa-bolt"></i>
            </span>
            <div>
              <h3 className="text-sm font-bold text-white font-tech">Simulador de Eventos de Webhook (Testing)</h3>
              <p className="text-xs text-slate-400">Prueba la recepción e inyección en tiempo real en la bandeja.</p>
            </div>
          </div>
          {simSuccess && (
            <span className="text-xs font-bold text-[#10B981] bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-lg">
              ✓ Evento inyectado en tiempo real
            </span>
          )}
        </div>

        <form onSubmit={handleSimulate} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase font-tech block mb-1">Plataforma</label>
            <select
              value={simulatedPlatform}
              onChange={(e) => setSimulatedPlatform(e.target.value as PlatformType)}
              className="w-full bg-[#080C14] border border-[#141B29] rounded-xl p-2.5 text-xs text-slate-200"
            >
              <option value="INSTAGRAM">Instagram</option>
              <option value="FACEBOOK">Facebook</option>
              <option value="TIKTOK">TikTok</option>
              <option value="WHATSAPP">WhatsApp</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase font-tech block mb-1">Tipo de Mensaje</label>
            <select
              value={simulatedType}
              onChange={(e) => setSimulatedType(e.target.value as InteractionType)}
              className="w-full bg-[#080C14] border border-[#141B29] rounded-xl p-2.5 text-xs text-slate-200"
            >
              <option value="DIRECT_MESSAGE">Mensaje Directo (DM)</option>
              <option value="POST_COMMENT">Comentario en Publicación</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase font-tech block mb-1">Nombre del Cliente</label>
            <input
              type="text"
              value={simulatedName}
              onChange={(e) => setSimulatedName(e.target.value)}
              className="w-full bg-[#080C14] border border-[#141B29] rounded-xl p-2 text-xs text-slate-200"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase font-tech block mb-1">Contenido</label>
            <input
              type="text"
              value={simulatedContent}
              onChange={(e) => setSimulatedContent(e.target.value)}
              className="w-full bg-[#080C14] border border-[#141B29] rounded-xl p-2 text-xs text-slate-200"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isSimulating}
              className="w-full py-2.5 px-4 bg-[#00F0FF] hover:bg-[#00D7E5] disabled:opacity-50 text-[#030508] font-bold text-xs rounded-xl flex items-center justify-center gap-2 font-tech shadow-md shadow-[#00F0FF]/20"
            >
              <i className="fa-solid fa-play text-xs"></i>
              <span>{isSimulating ? 'Inyectando...' : 'Inyectar Evento Webhook'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Modal para Conectar Nueva Red Social (Portal al body) */}
      {isAddChannelModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[99999] flex items-start justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
            <div className="w-full max-w-lg bg-[#05080F] border border-[#141B29] rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4 my-auto">
              <div className="flex items-center justify-between pb-3 border-b border-[#141B29]">
                <div className="flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-2xl bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30 flex items-center justify-center text-sm shadow-sm">
                    <i className="fa-solid fa-link"></i>
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-white font-tech">Conectar Nueva Red Social</h3>
                    <p className="text-[11px] text-slate-400">Vincular Fanpage de Facebook, Instagram o WhatsApp</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddChannelModalOpen(false)}
                  className="w-8 h-8 rounded-lg bg-[#080C14] hover:bg-[#121824] text-slate-400 hover:text-white border border-[#141B29] flex items-center justify-center text-xs transition"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>

              <form onSubmit={handleCreateChannel} className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase font-tech block mb-1.5">
                    Plataforma
                  </label>
                  <select
                    value={newPlatform}
                    onChange={(e) => setNewPlatform(e.target.value as PlatformType)}
                    className="w-full bg-[#080C14] border border-[#141B29] focus:border-[#00F0FF]/60 rounded-xl p-2.5 text-xs text-white"
                  >
                    <option value="FACEBOOK">Facebook Fanpage (Meta Graph API)</option>
                    <option value="INSTAGRAM">Instagram Professional (Meta)</option>
                    <option value="WHATSAPP">WhatsApp Business Cloud API</option>
                    <option value="TIKTOK">TikTok for Business</option>
                    <option value="TWITTER_X">X / Twitter API v2</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase font-tech block mb-1.5">
                    Nombre de la Cuenta o Fanpage
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ej: KorevX Fanpage Oficial"
                    value={newAccountName}
                    onChange={(e) => setNewAccountName(e.target.value)}
                    className="w-full bg-[#080C14] border border-[#141B29] focus:border-[#00F0FF]/60 rounded-xl p-2.5 text-xs text-white placeholder-slate-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase font-tech block mb-1.5">
                    Identificador / Page ID / Handle
                  </label>
                  <input
                    type="text"
                    placeholder="ej: @korevx_oficial o ID de Página Meta (10987654321)"
                    value={newAccountHandle}
                    onChange={(e) => setNewAccountHandle(e.target.value)}
                    className="w-full bg-[#080C14] border border-[#141B29] focus:border-[#00F0FF]/60 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 font-mono"
                  />
                </div>

                {/* Guía de Configuración de Webhook Meta si es Facebook o Instagram */}
                {(newPlatform === 'FACEBOOK' || newPlatform === 'INSTAGRAM') && (
                  <div className="p-3.5 rounded-2xl bg-[#080C14] border border-[#00F0FF]/30 space-y-2 text-xs font-tech">
                    <div className="flex items-center gap-2 text-[#00F0FF] font-bold">
                      <i className="fa-brands fa-meta text-sm"></i>
                      <span>Configuración del Webhook en Meta for Developers:</span>
                    </div>
                    <div className="space-y-1.5 text-[11px] text-slate-300">
                      <div className="bg-[#05080F] p-2 rounded-lg border border-[#141B29] flex flex-col gap-0.5">
                        <span className="text-[10px] text-slate-500 uppercase">URL de devolución de llamada (Callback):</span>
                        <code className="text-cyan-300 font-mono text-[10px] break-all select-all">
                          http://localhost:3000/api/v1/webhooks/meta
                        </code>
                        <span className="text-[9px] text-slate-500 italic">
                          (En producción o con ngrok: https://tu-dominio.com/api/v1/webhooks/meta)
                        </span>
                      </div>
                      <div className="bg-[#05080F] p-2 rounded-lg border border-[#141B29] flex flex-col gap-0.5">
                        <span className="text-[10px] text-slate-500 uppercase">Token de Verificación (Verify Token):</span>
                        <code className="text-emerald-400 font-mono text-[10px] select-all">
                          korevx_webhook_verify_token_secure
                        </code>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Campos suscritos requeridos: <strong className="text-white">messages</strong>, <strong className="text-white">messaging_postbacks</strong>, <strong className="text-white">feed</strong>.
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-800/30 text-[11px] text-cyan-300">
                  <i className="fa-solid fa-circle-info mr-1.5"></i>
                  Al conectar este canal, quedará inmediatamente disponible para la recepción de mensajes y visible para los operadores.
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#111622]">
                  <button
                    type="button"
                    onClick={() => setIsAddChannelModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-[#080C14] border border-[#141B29] text-slate-400 hover:text-white text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#00F0FF] hover:bg-[#00D7E5] text-[#030508] text-xs font-bold font-tech shadow-md shadow-[#00F0FF]/20"
                  >
                    Conectar Canal
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
