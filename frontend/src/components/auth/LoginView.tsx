import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

interface LoginViewProps {
  onSuccess: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onSuccess }) => {
  const { login, changePassword, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Estado para modal obligatorio de cambio de contraseña
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changeError, setChangeError] = useState<string | null>(null);
  const [isChanging, setIsChanging] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const res = await login(email, password);
    if (!res.success) {
      setErrorMessage(res.error || 'Credenciales inválidas. Por favor verifica tu correo y contraseña.');
      return;
    }

    if (res.mustChangePassword) {
      setShowPasswordChangeModal(true);
    } else {
      onSuccess();
    }
  };

  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangeError(null);

    if (newPassword.length < 6) {
      setChangeError('La contraseña debe contener al menos 6 caracteres.');
      return;
    }

    if (newPassword === '123456789') {
      setChangeError('No puedes seguir usando la contraseña temporal por defecto (123456789).');
      return;
    }

    if (newPassword !== confirmPassword) {
      setChangeError('Las contraseñas ingresadas no coinciden.');
      return;
    }

    setIsChanging(true);
    try {
      const res = await changePassword(newPassword);
      if (res.success) {
        setShowPasswordChangeModal(false);
        onSuccess();
      } else {
        setChangeError(res.error || 'Error al actualizar la contraseña');
      }
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-[#030508] overflow-hidden p-4 select-none">
      {/* Fondo con imagen ambientada oficial de KorevX */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-25 mix-blend-screen scale-105 pointer-events-none"
        style={{ backgroundImage: `url('/login-bg.jpg')` }}
      />

      {/* Gradientes radiales de iluminación cian KorevX */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-[#00F0FF]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-[#10B981]/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Tarjeta de Autenticación */}
      <div className="relative z-10 w-full max-w-md bg-[#05080F]/90 backdrop-blur-2xl border border-[#141B29] hover:border-[#00F0FF]/40 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/80 transition-all duration-300 fade-in">
        
        {/* Cabecera con Emblema 3D Metálico */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="relative group mb-3">
            <div className="absolute -inset-1 bg-gradient-to-r from-[#00F0FF] to-[#0072FF] rounded-2xl blur-md opacity-40 group-hover:opacity-75 transition duration-300"></div>
            <img 
              src="/logo-korevx.png" 
              alt="KorevX Official Logo" 
              className="relative w-16 h-16 rounded-2xl object-cover ring-1 ring-[#00F0FF]/50 shadow-xl"
            />
          </div>

          <div className="flex items-center gap-2 mt-1">
            <h1 className="font-tech text-2xl font-bold tracking-wide text-white">
              Korev<span className="text-[#00F0FF]">X</span>
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/30 font-tech">
              Omnichannel
            </span>
          </div>
          <p className="text-xs text-slate-400 font-tech uppercase tracking-widest mt-1">
            Portal Unificado de Acceso
          </p>
        </div>

        {errorMessage && (
          <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
            <i className="fa-solid fa-triangle-exclamation text-rose-400 text-sm flex-shrink-0"></i>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Formulario Estándar: Correo y Contraseña */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-tech">
              Correo Electrónico
            </label>
            <div className="relative">
              <i className="fa-solid fa-envelope absolute left-3.5 top-3.5 text-slate-500 text-xs"></i>
              <input
                type="email"
                required
                placeholder="ej. admin@tuempresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 bg-[#080C14] border border-[#141B29] focus:border-[#00F0FF]/60 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-tech">
              Contraseña
            </label>
            <div className="relative">
              <i className="fa-solid fa-lock absolute left-3.5 top-3.5 text-slate-500 text-xs"></i>
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 bg-[#080C14] border border-[#141B29] focus:border-[#00F0FF]/60 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none transition"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[#00F0FF] hover:bg-[#00D7E5] disabled:opacity-50 text-[#030508] font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-[#00F0FF]/20 font-tech uppercase tracking-wider"
            >
              {isLoading ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin text-xs"></i>
                  <span>Verificando Credenciales...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-shield-halved text-xs"></i>
                  <span>Ingresar a KorevX</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Footer Seguridad */}
        <div className="mt-6 pt-5 border-t border-[#111622] flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
            <span>Autenticación Multi-Tenant Segura</span>
          </span>
          <span className="font-tech text-slate-400">v2.1.0</span>
        </div>
      </div>

      {/* Modal Obligatorio de Cambio de Contraseña */}
      {showPasswordChangeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-[#05080F] border border-amber-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-amber-500/10 fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center text-lg">
                <i className="fa-solid fa-key"></i>
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-tech">
                  Cambio Obligatorio de Contraseña
                </h3>
                <p className="text-[11px] text-amber-400 font-medium">
                  Contraseña temporal detectada (123456789)
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-5">
              Por políticas de seguridad y aislamiento multi-tenant, debes definir una contraseña nueva y personal antes de continuar.
            </p>

            {changeError && (
              <div className="mb-4 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <i className="fa-solid fa-circle-exclamation text-rose-400"></i>
                <span>{changeError}</span>
              </div>
            )}

            <form onSubmit={handlePasswordChangeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-tech">
                  Nueva Contraseña (mínimo 6 caracteres)
                </label>
                <input
                  type="password"
                  required
                  placeholder="Tu nueva clave segura"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#080C14] border border-[#141B29] focus:border-amber-400/60 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-tech">
                  Confirmar Nueva Contraseña
                </label>
                <input
                  type="password"
                  required
                  placeholder="Repite tu nueva contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#080C14] border border-[#141B29] focus:border-amber-400/60 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none transition"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isChanging}
                  className="w-full py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-amber-500/20 font-tech uppercase tracking-wider"
                >
                  {isChanging ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i>
                      <span>Guardando Nueva Contraseña...</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-lock-open"></i>
                      <span>Actualizar y Entrar</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
