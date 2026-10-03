import React, { useState, useEffect } from 'react';
import { useServerStatus } from '../../services/serverHealth';

export const ServerWarmupOverlay: React.FC = () => {
  const serverStatus = useServerStatus();
  const [isVisible, setIsVisible] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [progress, setProgress] = useState(15);
  const [stepText, setStepText] = useState('Contactando infraestructura...');

  useEffect(() => {
    // Si ya está online desde el primer instante, no mostramos el overlay
    if (serverStatus === 'online') {
      if (isVisible) {
        setProgress(100);
        setStepText('¡Servicios sincronizados y listos!');
        const fadeTimer = setTimeout(() => {
          setIsFadingOut(true);
          const hideTimer = setTimeout(() => {
            setIsVisible(false);
          }, 400);
          return () => clearTimeout(hideTimer);
        }, 600);
        return () => clearTimeout(fadeTimer);
      }
      return;
    }

    // Pequeño retardo de gracia (700ms): si responde de inmediato no parpadea
    const graceTimer = setTimeout(() => {
      setIsVisible(true);
    }, 700);

    return () => clearTimeout(graceTimer);
  }, [serverStatus, isVisible]);

  useEffect(() => {
    if (!isVisible || serverStatus === 'online') return;

    // Simulación fluida de avance mientras arranca el backend
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          setStepText('Finalizando sincronización de módulos...');
          return 95;
        }

        const remaining = 95 - prev;
        const inc = Math.max(0.4, remaining * 0.055);
        const next = Math.min(95, prev + inc);

        if (next > 75) {
          setStepText('Sincronizando bandejas y canales de mensajería...');
        } else if (next > 50) {
          setStepText('Estableciendo enlace seguro y WebSockets...');
        } else if (next > 25) {
          setStepText('Inicializando núcleo KorevX Omnichannel...');
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible, serverStatus]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999999] flex items-center justify-center p-4 transition-opacity duration-400 select-none ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        backgroundColor: 'rgba(3, 5, 8, 0.82)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
      }}
    >
      {/* Tarjeta Central Glassmorphism */}
      <div className="relative max-w-md w-full bg-[#060A14]/90 border border-[#00F0FF]/30 rounded-3xl p-7 sm:p-9 shadow-[0_0_60px_rgba(0,240,255,0.18)] text-center overflow-hidden">
        {/* Glow ambiental de fondo */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#00F0FF]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Logo Oficial de KorevX con efectos de brillo */}
        <div className="relative mx-auto w-20 h-20 mb-4 flex items-center justify-center">
          <div className="absolute -inset-1.5 bg-gradient-to-r from-[#00F0FF] via-[#0072FF] to-[#00F0FF] rounded-2xl blur-md opacity-60 animate-pulse pointer-events-none" />
          <img
            src="/logo-korevx.png"
            alt="KorevX Omnichannel"
            className="relative w-16 h-16 rounded-2xl object-cover ring-1 ring-[#00F0FF]/60 shadow-2xl"
          />
        </div>

        {/* Título y subtítulo profesional */}
        <h2 className="text-xl sm:text-2xl font-bold font-tech text-white tracking-wide">
          Korev<span className="text-[#00F0FF]">X</span> Omnichannel
        </h2>
        <p className="text-xs text-[#00F0FF] font-tech uppercase tracking-widest mt-1">
          {serverStatus === 'online' ? 'CONEXIÓN ESTABLECIDA' : 'SINCRONIZANDO NÚCLEO OMNICANAL'}
        </p>

        {/* Mensaje profesional sin mención de hosting ni servidor gratuito */}
        <p className="text-xs text-slate-300/90 mt-3 leading-relaxed">
          {serverStatus === 'online'
            ? '¡Conexión completada! Cargando módulos y datos en vivo...'
            : 'Conectando con la infraestructura omnicanal y preparando el entorno seguro de trabajo.'}
        </p>

        {/* Barra de progreso con gradiente y porcentaje */}
        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between text-xs font-tech">
            <span className="flex items-center gap-2 text-slate-300">
              {serverStatus !== 'online' ? (
                <i className="fa-solid fa-spinner fa-spin text-[#00F0FF]" />
              ) : (
                <i className="fa-solid fa-circle-check text-emerald-400" />
              )}
              <span className="truncate max-w-[240px] text-left">{stepText}</span>
            </span>
            <span className="font-mono font-bold text-sm text-[#00F0FF] drop-shadow-[0_0_6px_rgba(0,240,255,0.6)]">
              {Math.round(progress)}%
            </span>
          </div>

          <div className="w-full bg-[#020408] border border-[#00F0FF]/25 rounded-full h-3 overflow-hidden p-0.5 shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${
                serverStatus === 'online'
                  ? 'bg-gradient-to-r from-emerald-400 to-[#00F0FF] shadow-[0_0_15px_rgba(52,211,153,0.8)]'
                  : 'bg-gradient-to-r from-[#00F0FF] via-cyan-400 to-sky-400 shadow-[0_0_15px_rgba(0,240,255,0.7)]'
              }`}
              style={{ width: `${Math.round(progress)}%` }}
            />
          </div>
        </div>

        {/* Pie de seguridad y garantía profesional */}
        <div className="mt-6 pt-4 border-t border-[#111A2E] flex items-center justify-between text-[11px] text-slate-400 font-tech">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <i className="fa-solid fa-shield-halved"></i>
            <span>Infraestructura Segura Multi-Tenant</span>
          </span>
          <span className="text-slate-400 font-tech">KorevX Core</span>
        </div>
      </div>
    </div>
  );
};
