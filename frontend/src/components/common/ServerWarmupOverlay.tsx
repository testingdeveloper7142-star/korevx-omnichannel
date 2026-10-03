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
        setStepText('¡Servidor conectado exitosamente!');
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

    // Simulación fluida de avance mientras Render arranca el contenedor (30-40s)
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          setStepText('Finalizando inicialización de base de datos...');
          return 95;
        }

        const remaining = 95 - prev;
        const inc = Math.max(0.4, remaining * 0.055);
        const next = Math.min(95, prev + inc);

        if (next > 70) {
          setStepText('Iniciando servicios y WebSocket...');
        } else if (next > 40) {
          setStepText('Reactivando contenedor en la nube...');
        } else if (next > 20) {
          setStepText('Despertando instancia en Render...');
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
        backgroundColor: 'rgba(3, 5, 8, 0.78)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      {/* Tarjeta Central Glassmorphism */}
      <div className="relative max-w-md w-full bg-[#060A14]/90 border border-[#00F0FF]/30 rounded-3xl p-7 sm:p-9 shadow-[0_0_60px_rgba(0,240,255,0.18)] text-center overflow-hidden">
        {/* Glow de fondo */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#00F0FF]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Icono animado */}
        <div className="relative mx-auto w-20 h-20 mb-5 flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-[#00F0FF]/10 border border-[#00F0FF]/30 animate-pulse" />
          <div className="absolute -inset-1.5 rounded-2xl border border-[#00F0FF]/20 animate-ping opacity-30" />
          {serverStatus === 'online' ? (
            <i className="fa-solid fa-circle-check text-4xl text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
          ) : (
            <i className="fa-solid fa-cloud-arrow-up text-3xl text-[#00F0FF] drop-shadow-[0_0_12px_rgba(0,240,255,0.8)] animate-bounce" />
          )}
        </div>

        {/* Título y subtítulo */}
        <h2 className="text-xl sm:text-2xl font-bold font-tech text-white tracking-wide">
          KorevX Omnichannel
        </h2>
        <p className="text-xs text-[#00F0FF] font-tech uppercase tracking-widest mt-1">
          {serverStatus === 'online' ? 'Servidor Listo' : 'Iniciando Servidor en la Nube'}
        </p>

        {/* Explicación amigable */}
        <p className="text-xs text-slate-300/90 mt-3 leading-relaxed">
          {serverStatus === 'online'
            ? '¡Conexión completada! Cargando interfaz en tiempo real...'
            : 'El servidor gratuito entra en reposo tras periodos de inactividad. Estamos reactivando los servicios para ti; el acceso se habilitará en segundos.'}
        </p>

        {/* Barra de progreso */}
        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between text-xs font-tech">
            <span className="flex items-center gap-2 text-slate-400">
              {serverStatus !== 'online' && (
                <i className="fa-solid fa-spinner fa-spin text-[#00F0FF]" />
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
                  : 'bg-gradient-to-r from-[#00F0FF] via-cyan-400 to-amber-400 shadow-[0_0_15px_rgba(0,240,255,0.7)]'
              }`}
              style={{ width: `${Math.round(progress)}%` }}
            />
          </div>
        </div>

        {/* Pie de seguridad y garantía */}
        <div className="mt-6 pt-4 border-t border-[#111A2E] flex items-center justify-between text-[11px] text-slate-400 font-tech">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <i className="fa-solid fa-shield-halved"></i>
            <span>Tus datos y canales están seguros</span>
          </span>
          <span className="text-slate-500 font-mono">Render Cloud</span>
        </div>
      </div>
    </div>
  );
};
