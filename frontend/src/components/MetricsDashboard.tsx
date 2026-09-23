import React, { useState } from 'react';
import { ChannelAccount } from '../types';

interface MetricsDashboardProps {
  channels?: ChannelAccount[];
}

export const MetricsDashboard: React.FC<MetricsDashboardProps> = ({ channels = [] }) => {
  const [timeRange, setTimeRange] = useState<'today' | '7days' | '30days'>('7days');

  const getPlatformDisplay = (platform: string) => {
    switch (platform) {
      case 'INSTAGRAM':
        return {
          name: 'Instagram Direct',
          icon: (
            <span className="w-5 h-5 rounded flex items-center justify-center bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-[10px] text-white flex-shrink-0">
              <i className="fa-brands fa-instagram"></i>
            </span>
          ),
          barColor: 'bg-gradient-to-r from-amber-500 to-rose-500',
        };
      case 'FACEBOOK':
        return {
          name: 'Facebook Messenger',
          icon: (
            <span className="w-5 h-5 rounded flex items-center justify-center bg-[#1877F2] text-[10px] text-white flex-shrink-0">
              <i className="fa-brands fa-facebook-f"></i>
            </span>
          ),
          barColor: 'bg-blue-500',
        };
      case 'TIKTOK':
        return {
          name: 'TikTok Video Comments',
          icon: (
            <span className="w-5 h-5 rounded bg-black border border-slate-700 flex items-center justify-center text-[10px] text-white flex-shrink-0">
              <i className="fa-brands fa-tiktok text-cyan-400"></i>
            </span>
          ),
          barColor: 'bg-cyan-400',
        };
      case 'WHATSAPP':
        return {
          name: 'WhatsApp Business API',
          icon: (
            <span className="w-5 h-5 rounded bg-[#25D366] flex items-center justify-center text-[10px] text-white flex-shrink-0">
              <i className="fa-brands fa-whatsapp"></i>
            </span>
          ),
          barColor: 'bg-[#25D366]',
        };
      case 'TELEGRAM':
        return {
          name: 'Telegram Bot',
          icon: (
            <span className="w-5 h-5 rounded bg-[#229ED9] flex items-center justify-center text-[10px] text-white flex-shrink-0">
              <i className="fa-brands fa-telegram"></i>
            </span>
          ),
          barColor: 'bg-[#229ED9]',
        };
      case 'TWITTER':
        return {
          name: 'X (Twitter)',
          icon: (
            <span className="w-5 h-5 rounded bg-black border border-slate-700 flex items-center justify-center text-[10px] text-white flex-shrink-0">
              <i className="fa-brands fa-x-twitter"></i>
            </span>
          ),
          barColor: 'bg-slate-300',
        };
      default:
        return {
          name: platform,
          icon: (
            <span className="w-5 h-5 rounded bg-[#00F0FF]/20 text-[#00F0FF] flex items-center justify-center text-[10px] flex-shrink-0">
              <i className="fa-solid fa-satellite-dish"></i>
            </span>
          ),
          barColor: 'bg-[#00F0FF]',
        };
    }
  };

  const activePlatforms = channels.length > 0
    ? Array.from(new Set(channels.map((c) => c.platform)))
    : ['INSTAGRAM', 'FACEBOOK', 'TIKTOK'];

  const baseVolume: Record<string, number> = {
    INSTAGRAM: 685,
    FACEBOOK: 457,
    TIKTOK: 286,
    WHATSAPP: 342,
    TELEGRAM: 180,
    TWITTER: 120,
  };

  const channelStats = activePlatforms.map((platform) => {
    const msgs = baseVolume[platform] || 190;
    return {
      platform,
      msgs,
      ...getPlatformDisplay(platform),
    };
  });

  const totalChannelMsgs = channelStats.reduce((sum, ch) => sum + ch.msgs, 0);

  return (
    <section className="w-full h-full overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#030508] fade-in space-y-6">
      {/* Cabecera del Panel de Métricas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#111622]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30 flex items-center justify-center text-sm shadow-sm shadow-[#00F0FF]/20">
              <i className="fa-solid fa-chart-line"></i>
            </span>
            <h2 className="text-xl font-bold text-white font-tech">
              Dashboard & Analíticas Omnicanal KorevX
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Métricas de rendimiento, tiempos de respuesta, gobernanza de datos y SLA en tiempo real.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Selector de Rango Temporal */}
          <div className="flex items-center bg-[#080C14] p-1 rounded-xl border border-[#141B29] text-xs">
            <button
              onClick={() => setTimeRange('today')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                timeRange === 'today'
                  ? 'bg-[#0E1524] text-[#00F0FF] border border-[#00F0FF]/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Hoy
            </button>
            <button
              onClick={() => setTimeRange('7days')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                timeRange === '7days'
                  ? 'bg-[#0E1524] text-[#00F0FF] border border-[#00F0FF]/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Últimos 7 Días
            </button>
            <button
              onClick={() => setTimeRange('30days')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                timeRange === '30days'
                  ? 'bg-[#0E1524] text-[#00F0FF] border border-[#00F0FF]/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              30 Días
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#080C14] border border-[#141B29] text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
            <span className="font-tech">En Vivo</span>
          </div>
        </div>
      </div>

      {/* Tarjetas Principales de KPI (Grid 6 columnas responsivo) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* 1. Volumen Total */}
        <div className="p-4 rounded-2xl bg-[#05080F] border border-[#111726] relative overflow-hidden">
          <p className="text-[10px] font-bold text-slate-400 font-tech uppercase tracking-wider">
            Total Mensajes
          </p>
          <p className="text-2xl font-bold text-white font-tech mt-1">1,428</p>
          <span className="text-[10px] text-[#10B981] font-tech font-bold flex items-center gap-1 mt-1">
            <i className="fa-solid fa-arrow-trend-up text-[9px]"></i> +18.4% vs periodo ant.
          </span>
        </div>

        {/* 2. Primera Respuesta (FRT) */}
        <div className="p-4 rounded-2xl bg-[#05080F] border border-[#00F0FF]/30 relative overflow-hidden">
          <p className="text-[10px] font-bold text-slate-300 font-tech uppercase tracking-wider">
            1ra Respuesta (FRT)
          </p>
          <p className="text-2xl font-bold text-[#00F0FF] font-tech mt-1">1m 45s</p>
          <span className="text-[10px] text-[#10B981] font-tech font-bold flex items-center gap-1 mt-1">
            <i className="fa-solid fa-check text-[9px]"></i> Meta SLA (&lt;2m)
          </span>
        </div>

        {/* 3. Tiempo Medio de Resolución (MTTR) */}
        <div className="p-4 rounded-2xl bg-[#05080F] border border-[#111726]">
          <p className="text-[10px] font-bold text-slate-400 font-tech uppercase tracking-wider">
            Tiempo de Resolución
          </p>
          <p className="text-2xl font-bold text-slate-200 font-tech mt-1">8m 12s</p>
          <span className="text-[10px] text-cyan-400 font-tech font-bold flex items-center gap-1 mt-1">
            <i className="fa-solid fa-bolt text-[9px]"></i> -42s optimizado
          </span>
        </div>

        {/* 4. Tasa de Resolución (FCR) */}
        <div className="p-4 rounded-2xl bg-[#05080F] border border-[#111726]">
          <p className="text-[10px] font-bold text-slate-400 font-tech uppercase tracking-wider">
            Resolución en 1er Contacto
          </p>
          <p className="text-2xl font-bold text-[#10B981] font-tech mt-1">88.6%</p>
          <span className="text-[10px] text-[#10B981] font-tech font-bold flex items-center gap-1 mt-1">
            <i className="fa-solid fa-arrow-up text-[9px]"></i> +4.2% efectividad
          </span>
        </div>

        {/* 5. Satisfacción CSAT */}
        <div className="p-4 rounded-2xl bg-[#05080F] border border-[#111726]">
          <p className="text-[10px] font-bold text-slate-400 font-tech uppercase tracking-wider">
            Satisfacción (CSAT)
          </p>
          <p className="text-2xl font-bold text-amber-400 font-tech mt-1">4.9 / 5.0</p>
          <div className="flex items-center gap-1 text-[10px] text-amber-300 mt-1">
            <i className="fa-solid fa-star text-[9px]"></i>
            <i className="fa-solid fa-star text-[9px]"></i>
            <i className="fa-solid fa-star text-[9px]"></i>
            <i className="fa-solid fa-star text-[9px]"></i>
            <i className="fa-solid fa-star-half-stroke text-[9px]"></i>
            <span className="font-tech font-bold ml-1">98% Positivo</span>
          </div>
        </div>

        {/* 6. Cumplimiento SLA Global */}
        <div className="p-4 rounded-2xl bg-[#05080F] border border-emerald-500/30">
          <p className="text-[10px] font-bold text-emerald-300 font-tech uppercase tracking-wider">
            Cumplimiento SLA
          </p>
          <p className="text-2xl font-bold text-emerald-400 font-tech mt-1">98.4%</p>
          <span className="text-[10px] text-emerald-400 font-tech font-bold flex items-center gap-1 mt-1">
            ✓ Nivel Excelente
          </span>
        </div>

        {/* 7. Tasa de Retención / Fidelización */}
        <div className="p-4 rounded-2xl bg-[#05080F] border border-cyan-500/30">
          <p className="text-[10px] font-bold text-cyan-300 font-tech uppercase tracking-wider">
            Tasa de Retención
          </p>
          <p className="text-2xl font-bold text-[#00F0FF] font-tech mt-1">94.2%</p>
          <span className="text-[10px] text-[#10B981] font-tech font-bold flex items-center gap-1 mt-1">
            <i className="fa-solid fa-arrow-up text-[9px]"></i> +3.1% fidelización
          </span>
        </div>

        {/* 8. Tasa de Abandono en Cola */}
        <div className="p-4 rounded-2xl bg-[#05080F] border border-emerald-900/40">
          <p className="text-[10px] font-bold text-slate-400 font-tech uppercase tracking-wider">
            Tasa de Abandono
          </p>
          <p className="text-2xl font-bold text-emerald-400 font-tech mt-1">1.8%</p>
          <span className="text-[10px] text-emerald-400 font-tech font-bold flex items-center gap-1 mt-1">
            ✓ Umbral Óptimo (&lt;5%)
          </span>
        </div>
      </div>

      {/* Fila 2: Volumen por Canal + Horas Pico + Desglose de Interacciones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Volumen por Red Social */}
        <div className="p-5 rounded-2xl bg-[#05080F] border border-[#111726] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-tech">Volumen por Red Social</h3>
            <span className="text-xs text-slate-400 font-tech font-semibold">1,428 totales</span>
          </div>

          <div className="space-y-3.5">
            {channelStats.map((ch) => {
              const pct = totalChannelMsgs > 0 ? Math.round((ch.msgs / totalChannelMsgs) * 100) : 0;
              return (
                <div key={ch.platform}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-200 flex items-center gap-2">
                      {ch.icon}
                      <span className="truncate">{ch.name}</span>
                    </span>
                    <span className="text-white font-bold font-tech flex-shrink-0 ml-2">
                      {ch.msgs} msgs ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#0D1424]">
                    <div
                      className={`h-full rounded-full ${ch.barColor}`}
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-[#111622] grid grid-cols-2 gap-2 text-center text-xs">
            <div className="p-2 rounded-xl bg-[#080C14] border border-[#141B29]">
              <p className="text-[10px] text-slate-400 uppercase font-tech">DMs Directos</p>
              <p className="text-sm font-bold text-[#10B981] font-tech mt-0.5">971 (68%)</p>
            </div>
            <div className="p-2 rounded-xl bg-[#080C14] border border-[#141B29]">
              <p className="text-[10px] text-slate-400 uppercase font-tech">Comentarios Posts</p>
              <p className="text-sm font-bold text-amber-400 font-tech mt-0.5">457 (32%)</p>
            </div>
          </div>
        </div>

        {/* Horas Pico de Atención (Histograma por franja horaria) */}
        <div className="p-5 rounded-2xl bg-[#05080F] border border-[#111726] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-tech">Distribución Horas Pico</h3>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/15 text-[#00F0FF] border border-cyan-500/30 font-tech font-bold">
              Mayor volumen 2pm - 6pm
            </span>
          </div>

          <div className="flex items-end justify-between h-40 pt-4 px-2">
            {/* 8 AM */}
            <div className="flex flex-col items-center gap-1.5 flex-1">
              <span className="text-[9px] font-tech text-slate-400">12%</span>
              <div className="w-6 rounded-t bg-slate-800 h-[30px]"></div>
              <span className="text-[10px] text-slate-500 font-tech">8 AM</span>
            </div>

            {/* 11 AM */}
            <div className="flex flex-col items-center gap-1.5 flex-1">
              <span className="text-[9px] font-tech text-slate-400">22%</span>
              <div className="w-6 rounded-t bg-[#00F0FF]/40 h-[55px]"></div>
              <span className="text-[10px] text-slate-500 font-tech">11 AM</span>
            </div>

            {/* 2 PM (PICO) */}
            <div className="flex flex-col items-center gap-1.5 flex-1">
              <span className="text-[9px] font-tech text-[#00F0FF] font-bold">38%</span>
              <div className="w-6 rounded-t bg-[#00F0FF] h-[100px] shadow-md shadow-[#00F0FF]/30"></div>
              <span className="text-[10px] text-[#00F0FF] font-tech font-bold">2 PM</span>
            </div>

            {/* 5 PM (PICO) */}
            <div className="flex flex-col items-center gap-1.5 flex-1">
              <span className="text-[9px] font-tech text-cyan-300 font-bold">34%</span>
              <div className="w-6 rounded-t bg-cyan-400 h-[88px] shadow-sm"></div>
              <span className="text-[10px] text-slate-400 font-tech font-bold">5 PM</span>
            </div>

            {/* 8 PM */}
            <div className="flex flex-col items-center gap-1.5 flex-1">
              <span className="text-[9px] font-tech text-slate-400">18%</span>
              <div className="w-6 rounded-t bg-slate-700 h-[45px]"></div>
              <span className="text-[10px] text-slate-500 font-tech">8 PM</span>
            </div>

            {/* 11 PM */}
            <div className="flex flex-col items-center gap-1.5 flex-1">
              <span className="text-[9px] font-tech text-slate-400">6%</span>
              <div className="w-6 rounded-t bg-slate-800 h-[15px]"></div>
              <span className="text-[10px] text-slate-500 font-tech">11 PM</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#080C14] border border-[#141B29] text-[11px] text-slate-300 flex items-center gap-2">
            <i className="fa-solid fa-lightbulb text-amber-400"></i>
            <span>
              <strong>Recomendación:</strong> Reforzar 2 operadores adicionales en la franja de 2:00 PM a 6:00 PM.
            </span>
          </div>
        </div>

        {/* Desglose de Satisfacción CSAT y Cumplimiento ARCO */}
        <div className="p-5 rounded-2xl bg-[#05080F] border border-[#111726] space-y-4">
          <h3 className="text-sm font-bold text-white font-tech">Calidad de Atención y Datos</h3>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300">5 Estrellas (Excelente)</span>
              <span className="font-bold text-amber-300 font-tech">82%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#0D1424]">
              <div className="h-full rounded-full bg-amber-400" style={{ width: '82%' }}></div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300">4 Estrellas (Bueno)</span>
              <span className="font-bold text-slate-300 font-tech">14%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#0D1424]">
              <div className="h-full rounded-full bg-emerald-400" style={{ width: '14%' }}></div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300">3 Estrellas (Regular)</span>
              <span className="font-bold text-slate-400 font-tech">3%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#0D1424]">
              <div className="h-full rounded-full bg-blue-400" style={{ width: '3%' }}></div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300">1-2 Estrellas (Bajo)</span>
              <span className="font-bold text-rose-400 font-tech">1%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#0D1424]">
              <div className="h-full rounded-full bg-rose-500" style={{ width: '1%' }}></div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#111622] space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase font-tech">
              Gobernanza Ley 1581 / SIC
            </p>
            <div className="flex items-center justify-between p-2 rounded-xl bg-[#080C14] border border-[#141B29] text-xs">
              <span className="text-slate-300 flex items-center gap-1.5">
                <i className="fa-solid fa-shield-check text-[#10B981]"></i> Avisos de Privacidad Entregados
              </span>
              <span className="font-bold text-[#10B981] font-tech">100%</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-[#080C14] border border-[#141B29] text-xs">
              <span className="text-slate-300 flex items-center gap-1.5">
                <i className="fa-solid fa-clipboard-list text-amber-400"></i> Eventos Auditoría Registrados
              </span>
              <span className="font-bold text-amber-400 font-tech">100% Trazable</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-[#080C14] border border-[#141B29] text-xs">
              <span className="text-slate-300 flex items-center gap-1.5">
                <i className="fa-solid fa-lock text-[#00F0FF]"></i> Cifrado de Datos en Reposo
              </span>
              <span className="font-bold text-[#00F0FF] font-tech">AES-256</span>
            </div>
          </div>
        </div>
      </div>

      {/* Fila 2.5: Comparativa de Rendimiento por Canal Social */}
      <div className="p-5 rounded-2xl bg-[#05080F] border border-[#111726] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white font-tech">
              Comparativa de Rendimiento por Canal de Red Social
            </h3>
            <p className="text-xs text-slate-400">
              Tiempos de respuesta (FRT), tiempo medio de resolución (MTTR), CSAT y tasa de retención desglosados por canal.
            </p>
          </div>
          <span className="text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/30 font-tech font-semibold self-start">
            SLA Cumplido en todos los canales
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-[#111622] text-slate-400 text-[11px]">
                <th className="pb-3 font-tech">Canal Oficial</th>
                <th className="pb-3 font-tech">Volumen Mensajes</th>
                <th className="pb-3 font-tech">1ra Respuesta (FRT)</th>
                <th className="pb-3 font-tech">Resolución (MTTR)</th>
                <th className="pb-3 font-tech">Satisfacción CSAT</th>
                <th className="pb-3 font-tech">Retención</th>
                <th className="pb-3 font-tech">Cumplimiento SLA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#111622]">
              {channelStats.map((ch) => {
                const frt = ch.platform === 'WHATSAPP' ? '1m 15s' : ch.platform === 'INSTAGRAM' ? '1m 45s' : ch.platform === 'FACEBOOK' ? '2m 10s' : '3m 25s';
                const mttr = ch.platform === 'WHATSAPP' ? '5m 30s' : ch.platform === 'INSTAGRAM' ? '7m 40s' : ch.platform === 'FACEBOOK' ? '9m 15s' : '11m 20s';
                const csat = ch.platform === 'WHATSAPP' ? '4.95 / 5.0' : ch.platform === 'INSTAGRAM' ? '4.90 / 5.0' : ch.platform === 'FACEBOOK' ? '4.82 / 5.0' : '4.78 / 5.0';
                const ret = ch.platform === 'WHATSAPP' ? '96.5%' : ch.platform === 'INSTAGRAM' ? '94.8%' : ch.platform === 'FACEBOOK' ? '92.4%' : '90.1%';
                const sla = ch.platform === 'WHATSAPP' ? '99.2%' : ch.platform === 'INSTAGRAM' ? '98.6%' : ch.platform === 'FACEBOOK' ? '97.8%' : '96.2%';

                return (
                  <tr key={`comp-${ch.platform}`} className="hover:bg-[#080C14] transition">
                    <td className="py-3 font-semibold text-white flex items-center gap-2.5">
                      {ch.icon}
                      <span className="font-bold text-white">{ch.name}</span>
                    </td>
                    <td className="py-3 text-white font-bold font-tech">{ch.msgs} msgs</td>
                    <td className="py-3 text-[#00F0FF] font-bold font-tech">{frt}</td>
                    <td className="py-3 text-slate-300 font-tech">{mttr}</td>
                    <td className="py-3 text-amber-300 font-bold font-tech">⭐ {csat}</td>
                    <td className="py-3 text-emerald-400 font-bold font-tech">{ret}</td>
                    <td className="py-3 font-tech">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-[#10B981] font-bold border border-emerald-500/30">
                        {sla}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fila 3: Matriz Completa de Rendimiento de Operadores */}
      <div className="p-5 rounded-2xl bg-[#05080F] border border-[#111726] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white font-tech">
              Matriz de Rendimiento Individual del Equipo
            </h3>
            <p className="text-xs text-slate-400">
              Métricas de productividad, volumen de atención y calificación de cada operador.
            </p>
          </div>
          <span className="text-xs text-[#00F0FF] bg-[#00F0FF]/10 px-3 py-1 rounded-xl border border-[#00F0FF]/30 font-tech font-semibold self-start">
            4 Operadores Activos
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-[#111622] text-slate-400 text-[11px]">
                <th className="pb-3 font-tech">Operador / Agente</th>
                <th className="pb-3 font-tech">Atendidos</th>
                <th className="pb-3 font-tech">Resueltos</th>
                <th className="pb-3 font-tech">Tasa Resolución</th>
                <th className="pb-3 font-tech">Tiempo Medio FRT</th>
                <th className="pb-3 font-tech">Calificación CSAT</th>
                <th className="pb-3 font-tech">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#111622]">
              <tr>
                <td className="py-3 font-semibold text-white flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-[#00F0FF]/20 text-[#00F0FF] flex items-center justify-center font-bold text-xs font-tech">
                    CA
                  </span>
                  <div>
                    <p className="font-bold text-white">Carlos Agente</p>
                    <p className="text-[10px] text-slate-400">carlos@korevx.com</p>
                  </div>
                </td>
                <td className="py-3 text-white font-bold font-tech">42</td>
                <td className="py-3 text-[#10B981] font-bold font-tech">38</td>
                <td className="py-3 font-tech">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-[#10B981] font-bold">
                    90.4%
                  </span>
                </td>
                <td className="py-3 text-[#00F0FF] font-bold font-tech">1m 50s</td>
                <td className="py-3 text-amber-300 font-bold font-tech">⭐ 4.9 / 5.0</td>
                <td className="py-3">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-[#10B981] font-bold font-tech">
                    Online
                  </span>
                </td>
              </tr>

              <tr>
                <td className="py-3 font-semibold text-white flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-xs font-tech">
                    LM
                  </span>
                  <div>
                    <p className="font-bold text-white">Laura Morales (Supervisora)</p>
                    <p className="text-[10px] text-slate-400">supervisor@korevx.com</p>
                  </div>
                </td>
                <td className="py-3 text-white font-bold font-tech">28</td>
                <td className="py-3 text-[#10B981] font-bold font-tech">27</td>
                <td className="py-3 font-tech">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-[#10B981] font-bold">
                    96.4%
                  </span>
                </td>
                <td className="py-3 text-[#00F0FF] font-bold font-tech">1m 30s</td>
                <td className="py-3 text-amber-300 font-bold font-tech">⭐ 5.0 / 5.0</td>
                <td className="py-3">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-[#10B981] font-bold font-tech">
                    Online
                  </span>
                </td>
              </tr>

              <tr>
                <td className="py-3 font-semibold text-white flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold text-xs font-tech">
                    MG
                  </span>
                  <div>
                    <p className="font-bold text-white">Mateo Gómez</p>
                    <p className="text-[10px] text-slate-400">mateo@korevx.com</p>
                  </div>
                </td>
                <td className="py-3 text-white font-bold font-tech">19</td>
                <td className="py-3 text-[#10B981] font-bold font-tech">17</td>
                <td className="py-3 font-tech">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-[#10B981] font-bold">
                    89.5%
                  </span>
                </td>
                <td className="py-3 text-[#00F0FF] font-bold font-tech">2m 45s</td>
                <td className="py-3 text-amber-300 font-bold font-tech">⭐ 4.8 / 5.0</td>
                <td className="py-3">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-bold font-tech">
                    En Pausa
                  </span>
                </td>
              </tr>

              <tr>
                <td className="py-3 font-semibold text-white flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-300 flex items-center justify-center font-bold text-xs font-tech">
                    SL
                  </span>
                  <div>
                    <p className="font-bold text-white">Sofía López</p>
                    <p className="text-[10px] text-slate-400">sofia@korevx.com</p>
                  </div>
                </td>
                <td className="py-3 text-white font-bold font-tech">15</td>
                <td className="py-3 text-[#10B981] font-bold font-tech">14</td>
                <td className="py-3 font-tech">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-[#10B981] font-bold">
                    93.3%
                  </span>
                </td>
                <td className="py-3 text-[#00F0FF] font-bold font-tech">2m 10s</td>
                <td className="py-3 text-amber-300 font-bold font-tech">⭐ 4.9 / 5.0</td>
                <td className="py-3">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-[#10B981] font-bold font-tech">
                    Online
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
