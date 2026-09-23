import React, { useState } from 'react';
import { useAuth, UserRole } from '../../context/AuthContext';

interface LoginViewProps {
  onSuccess: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onSuccess }) => {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('carlos@korevx.com');
  const [password, setPassword] = useState('••••••••••••');
  const [selectedRole, setSelectedRole] = useState<UserRole>('AGENT');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(selectedRole, email);
    onSuccess();
  };

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    if (role === 'AGENT') setEmail('carlos@korevx.com');
    if (role === 'ADMIN') setEmail('supervisor@korevx.com');
    if (role === 'SUPER_ADMIN') setEmail('core@korevx.com');
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
            Gobernanza & Trazabilidad Central
          </p>
        </div>

        {/* Selector de Rol Rápido para Pruebas de Auditoría */}
        <div className="mb-6 bg-[#080C14] p-1 rounded-xl border border-[#141B29]">
          <p className="text-[10px] font-bold text-slate-400 font-tech uppercase tracking-wider px-2 pt-1 mb-1">
            Seleccionar Perfil de Acceso
          </p>
          <div className="grid grid-cols-3 gap-1">
            <button
              type="button"
              onClick={() => handleRoleSelect('AGENT')}
              className={`py-2 rounded-lg text-xs font-semibold transition ${
                selectedRole === 'AGENT'
                  ? 'bg-[#0E1524] text-white border border-[#00F0FF]/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Agente
            </button>
            <button
              type="button"
              onClick={() => handleRoleSelect('ADMIN')}
              className={`py-2 rounded-lg text-xs font-semibold transition ${
                selectedRole === 'ADMIN'
                  ? 'bg-[#0E1524] text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => handleRoleSelect('SUPER_ADMIN')}
              className={`py-2 rounded-lg text-xs font-semibold transition ${
                selectedRole === 'SUPER_ADMIN'
                  ? 'bg-[#0E1524] text-[#00F0FF] border border-[#00F0FF]/50 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Super Admin
            </button>
          </div>
        </div>

        {/* Administradores de Empresas Creadas (si existen) */}
        {(() => {
          let createdAdmins: any[] = [];
          try {
            const saved = localStorage.getItem('korevx_registered_admins');
            createdAdmins = saved ? JSON.parse(saved) : [];
          } catch {}
          if (!Array.isArray(createdAdmins) || createdAdmins.length === 0) return null;

          return (
            <div className="mb-5 p-2.5 rounded-xl bg-[#080C14] border border-[#141B29] space-y-1.5 font-tech">
              <div className="flex items-center justify-between text-[10px] px-1 text-slate-400 uppercase tracking-wider">
                <span className="text-amber-400 font-bold flex items-center gap-1.5">
                  <i className="fa-solid fa-building"></i>
                  <span>Empresas Creadas ({createdAdmins.length})</span>
                </span>
                <span className="text-[9px] text-slate-500">Clic para autocompletar</span>
              </div>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                {createdAdmins.map((adm: any) => (
                  <button
                    key={adm.email}
                    type="button"
                    onClick={() => {
                      setSelectedRole('ADMIN');
                      setEmail(adm.email);
                      setPassword(adm.initialPassword || 'KorevX.2026!');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] transition border flex items-center gap-1.5 ${
                      email === adm.email
                        ? 'bg-[#0E1524] text-[#00F0FF] border-[#00F0FF]/50 shadow-sm'
                        : 'bg-[#05080F] text-slate-300 hover:text-white border-[#162032]'
                    }`}
                  >
                    <i className="fa-solid fa-user-tie text-[9px] text-amber-400"></i>
                    <span className="font-semibold">{adm.fullName}</span>
                    <span className="text-slate-500 text-[9px]">({adm.workspaceName})</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Formulario */}
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 bg-[#080C14] border border-[#141B29] focus:border-[#00F0FF]/60 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-tech">
              Contraseña de Acceso
            </label>
            <div className="relative">
              <i className="fa-solid fa-lock absolute left-3.5 top-3.5 text-slate-500 text-xs"></i>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 bg-[#080C14] border border-[#141B29] focus:border-[#00F0FF]/60 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition"
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
                  <span>Iniciando Sesión...</span>
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
            <span>Supabase Auth & RLS Activo</span>
          </span>
          <span className="font-tech text-slate-400">v1.2.0</span>
        </div>
      </div>
    </div>
  );
};
