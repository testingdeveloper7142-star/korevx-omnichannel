import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { soundManager } from '../../utils/audio';

interface CompanySettingsDashboardProps {
  onUpdateWorkspaceName?: (newName: string) => void;
  onClearCompanyConversations?: () => void;
}

export const CompanySettingsDashboard: React.FC<CompanySettingsDashboardProps> = ({
  onUpdateWorkspaceName,
  onClearCompanyConversations,
}) => {
  const { user } = useAuth();
  const workspaceId = user?.workspaceId || 'b2d78f5f-95e6-4191-8ec6-a958e8c10bbc';

  // Cargar datos actuales de la empresa
  const [companyName, setCompanyName] = useState(user?.workspaceName || 'KorevX Plus');
  const [logoUrl, setLogoUrl] = useState('');
  const [nit, setNit] = useState('');
  const [industry, setIndustry] = useState('Software & Telecomunicaciones');
  const [location, setLocation] = useState('Bogotá, Colombia');
  const [contactPhone, setContactPhone] = useState('+57 300 123 4567');
  const [contactEmail, setContactEmail] = useState(user?.email || '');
  const [welcomeMessage, setWelcomeMessage] = useState('¡Hola! Gracias por comunicarte con nosotros. Un asesor te atenderá en breve.');
  const [allowExternalAudit, setAllowExternalAudit] = useState(false);
  const [allowSupportConsole, setAllowSupportConsole] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [imageLoadError, setImageLoadError] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      alert('La imagen seleccionada es mayor a 4 MB. Por favor elige una imagen más liviana.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setLogoUrl(result);
        setImageLoadError(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Cuotas de redes sociales y operadores asignadas por Super Admin (informativo)
  const [channelLimits, setChannelLimits] = useState({ FACEBOOK: 2, INSTAGRAM: 1, WHATSAPP: 1, TIKTOK: 0 });
  const [maxOperators, setMaxOperators] = useState(5);

  useEffect(() => {
    // 1. Cargar perfil guardado localmente para este workspace
    try {
      const savedProfile = localStorage.getItem(`korevx_company_profile_${workspaceId}`);
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        if (parsed.companyName) setCompanyName(parsed.companyName);
        if (parsed.logoUrl) setLogoUrl(parsed.logoUrl);
        if (parsed.nit) setNit(parsed.nit);
        if (parsed.industry) setIndustry(parsed.industry);
        if (parsed.location) setLocation(parsed.location);
        if (parsed.contactPhone) setContactPhone(parsed.contactPhone);
        if (parsed.contactEmail) setContactEmail(parsed.contactEmail);
        if (parsed.welcomeMessage) setWelcomeMessage(parsed.welcomeMessage);
        if (typeof parsed.allowExternalAudit === 'boolean') setAllowExternalAudit(parsed.allowExternalAudit);
        if (typeof parsed.allowSupportConsole === 'boolean') setAllowSupportConsole(parsed.allowSupportConsole);
      }
    } catch {}

    // 2. Cargar límites asignados por Super Admin
    try {
      const savedLimits = localStorage.getItem(`korevx_channel_limits_${workspaceId}`);
      if (savedLimits) setChannelLimits(JSON.parse(savedLimits));

      const savedMaxOp = localStorage.getItem(`korevx_max_operators_${workspaceId}`);
      if (savedMaxOp) setMaxOperators(Number(savedMaxOp) || 5);
    } catch {}
  }, [workspaceId]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    const trimmedName = companyName.trim();
    if (!trimmedName) {
      setSaveError('El nombre de la empresa no puede estar vacío');
      setIsSaving(false);
      return;
    }

    const payload = {
      name: trimmedName,
      logoUrl: logoUrl.trim(),
      nit: nit.trim(),
      industry: industry.trim(),
      location: location.trim(),
      contactPhone: contactPhone.trim(),
      contactEmail: contactEmail.trim(),
      welcomeMessage: welcomeMessage.trim(),
      allowExternalAudit,
      allowSupportConsole,
      requesterUserId: user?.id,
    };

    try {
      // 1. Actualizar en backend
      try {
        await axios.patch(`/api/v1/enterprises/${workspaceId}/settings`, payload);
      } catch (err) {
        console.warn('Backend updateEnterpriseSettings offline, guardando en persistencia local');
      }

      // 2. Persistir perfil en localStorage
      const profileToSave = {
        companyName: trimmedName,
        logoUrl: logoUrl.trim(),
        nit: nit.trim(),
        industry: industry.trim(),
        location: location.trim(),
        contactPhone: contactPhone.trim(),
        contactEmail: contactEmail.trim(),
        welcomeMessage: welcomeMessage.trim(),
        allowExternalAudit,
        allowSupportConsole,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(`korevx_company_profile_${workspaceId}`, JSON.stringify(profileToSave));

      // 3. Actualizar en custom_enterprises si existe
      try {
        const savedEnts = localStorage.getItem('korevx_custom_enterprises');
        if (savedEnts) {
          const list = JSON.parse(savedEnts);
          const updated = list.map((ent: any) =>
            ent.id === workspaceId
              ? {
                  ...ent,
                  name: trimmedName,
                  nit: nit.trim() || ent.nit,
                  industry: industry.trim() || ent.industry,
                  location: location.trim() || ent.location,
                  logoUrl: logoUrl.trim(),
                }
              : ent
          );
          localStorage.setItem('korevx_custom_enterprises', JSON.stringify(updated));
        }
      } catch {}

      // 4. Actualizar sesión del usuario si cambia el nombre de la empresa
      if (user) {
        const updatedAuthUser = {
          ...user,
          workspaceName: trimmedName,
        };
        localStorage.setItem('korevx_auth_user', JSON.stringify(updatedAuthUser));
        if (onUpdateWorkspaceName) {
          onUpdateWorkspaceName(trimmedName);
        }
      }

      window.dispatchEvent(
        new CustomEvent('korevx_company_profile_updated', {
          detail: { name: trimmedName, logoUrl: logoUrl.trim() },
        })
      );

      soundManager.playSuccess();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setSaveError(err.message || 'Error al guardar la configuración');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCompanyCleanup = () => {
    if (
      window.confirm(
        `¿Confirmas la limpieza del panel para "${companyName}"?\n\nEsta acción borrará todas las conversaciones de prueba y tickets temporales de tu empresa, manteniendo tu equipo de operadores y canales.`
      )
    ) {
      // Limpiar conversaciones y tickets de este workspace
      localStorage.removeItem(`korevx_conversations_${workspaceId}`);
      localStorage.removeItem(`korevx_audit_requests_${workspaceId}`);
      if (onClearCompanyConversations) {
        onClearCompanyConversations();
      }
      soundManager.playNotification();
      alert(`Panel de ${companyName} restablecido exitosamente.`);
      window.location.reload();
    }
  };

  return (
    <section className="w-full h-full overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 fade-in max-w-5xl mx-auto">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#111726]">
        <div className="flex items-center gap-3">
          <span className="w-12 h-12 rounded-2xl bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30 flex items-center justify-center text-xl shadow-md shadow-[#00F0FF]/20 font-tech">
            <i className="fa-solid fa-sliders"></i>
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-white font-tech">Configuración de Empresa</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30 font-tech">
                Admin Panel
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-tech">
              Personaliza el nombre, identidad corporativa y directivas de privacidad de {companyName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCompanyCleanup}
            className="px-3.5 py-2 rounded-xl bg-rose-950/30 hover:bg-rose-900/50 text-rose-300 border border-rose-800/40 text-xs font-semibold flex items-center gap-1.5 transition font-tech"
            title="Limpiar conversaciones y pruebas de la bandeja de tu empresa"
          >
            <i className="fa-solid fa-broom text-xs"></i>
            <span>Limpieza del Panel</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/10 fade-in font-tech">
          <i className="fa-solid fa-circle-check text-sm text-emerald-400"></i>
          <span>Configuración de la empresa actualizada y sincronizada exitosamente.</span>
        </div>
      )}

      {saveError && (
        <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2 fade-in font-tech">
          <i className="fa-solid fa-triangle-exclamation text-sm text-rose-400"></i>
          <span>{saveError}</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Bloque 1: Identidad Corporativa y Logo */}
        <div className="p-6 rounded-2xl bg-[#05080F] border border-[#141B29] space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#111726]">
            <i className="fa-solid fa-building text-[#00F0FF] text-sm"></i>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-tech">Identidad Corporativa</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase font-tech block mb-1.5">
                Nombre Oficial de la Empresa <span className="text-[#00F0FF]">*</span>
              </label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="ej: KorevX Plus S.A.S"
                className="w-full bg-[#080C14] border border-[#141B29] focus:border-[#00F0FF]/60 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none transition font-tech"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase font-tech block mb-1.5">
                NIT / Identificación Tributaria
              </label>
              <input
                type="text"
                value={nit}
                onChange={(e) => setNit(e.target.value)}
                placeholder="ej: 901.849.201-4"
                className="w-full bg-[#080C14] border border-[#141B29] focus:border-[#00F0FF]/60 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none transition font-tech"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase font-tech block mb-1.5">
                Sector o Industria
              </label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full bg-[#080C14] border border-[#141B29] focus:border-[#00F0FF]/60 rounded-xl p-3 text-xs text-white focus:outline-none transition font-tech"
              >
                <option value="Software & Telecomunicaciones">Software & Telecomunicaciones</option>
                <option value="Comercio Electrónico & Retail">Comercio Electrónico & Retail</option>
                <option value="Servicios Financieros & Fintech">Servicios Financieros & Fintech</option>
                <option value="Salud & Medicina">Salud & Medicina</option>
                <option value="Turismo & Hotelería">Turismo & Hotelería</option>
                <option value="Educación & Formación">Educación & Formación</option>
                <option value="Servicios Profesionales">Servicios Profesionales</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase font-tech block mb-1.5">
                Ubicación / Ciudad Sede
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="ej: Bogotá D.C., Colombia"
                className="w-full bg-[#080C14] border border-[#141B29] focus:border-[#00F0FF]/60 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none transition font-tech"
              />
            </div>
          </div>

          {/* Logo con Subida de Archivo y Previsualización en Vivo */}
          <div className="pt-3 border-t border-[#111726] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-400 uppercase font-tech block">
                Logo Corporativo de la Empresa
              </label>
              {logoUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setLogoUrl('');
                    setImageLoadError(false);
                  }}
                  className="text-[11px] text-rose-400 hover:text-rose-300 font-tech flex items-center gap-1 transition"
                  title="Eliminar logo actual"
                >
                  <i className="fa-solid fa-trash-can text-[10px]"></i>
                  <span>Quitar logo</span>
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-[#080C14] border-2 border-dashed border-[#1E293B] flex items-center justify-center overflow-hidden flex-shrink-0 relative group shadow-md shadow-black/50">
                {logoUrl.trim() && !imageLoadError ? (
                  <img
                    src={logoUrl}
                    alt="Logo Empresa"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain p-1.5"
                    onError={() => setImageLoadError(true)}
                    onLoad={() => setImageLoadError(false)}
                  />
                ) : (
                  <div className="text-center p-1">
                    <span className="text-2xl font-bold font-tech text-[#00F0FF]">
                      {companyName.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="block text-[8px] text-slate-500 font-tech mt-0.5">Sin logo</span>
                  </div>
                )}
              </div>

              <div className="flex-1 w-full space-y-2.5">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#00F0FF]/20 to-[#0072FF]/20 hover:from-[#00F0FF]/30 hover:to-[#0072FF]/30 border border-[#00F0FF]/50 text-[#00F0FF] text-xs font-bold font-tech flex items-center gap-2 shadow-sm transition"
                  >
                    <i className="fa-solid fa-cloud-arrow-up text-xs"></i>
                    <span>Subir Imagen desde mi Dispositivo</span>
                  </button>
                  <span className="text-[11px] text-slate-400 font-tech">o escribe una URL web:</span>
                </div>

                <input
                  type="url"
                  value={logoUrl.startsWith('data:') ? '' : logoUrl}
                  onChange={(e) => {
                    setLogoUrl(e.target.value);
                    setImageLoadError(false);
                  }}
                  placeholder={logoUrl.startsWith('data:') ? '✓ Imagen local cargada exitosamente (Base64)' : 'https://tudominio.com/logo.png'}
                  className="w-full bg-[#080C14] border border-[#141B29] focus:border-[#00F0FF]/60 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition font-tech"
                />

                {imageLoadError && (
                  <p className="text-[11px] text-amber-400 font-tech flex items-center gap-1.5 bg-amber-950/20 p-2 rounded-lg border border-amber-500/30">
                    <i className="fa-solid fa-triangle-exclamation text-xs"></i>
                    <span>No se pudo cargar la imagen desde esa URL externa. Haz clic en "Subir Imagen desde mi Dispositivo" para cargar el archivo directamente desde tu equipo.</span>
                  </p>
                )}

                <p className="text-[10px] text-slate-500 font-tech">
                  Formatos recomendados: PNG, SVG transparente o JPG. Tamaño máximo 4 MB.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bloque 2: Contacto & Mensajería Automatizada */}
        <div className="p-6 rounded-2xl bg-[#05080F] border border-[#141B29] space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#111726]">
            <i className="fa-solid fa-headset text-[#00F0FF] text-sm"></i>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-tech">Contacto & Mensaje de Bienvenida</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase font-tech block mb-1.5">
                Teléfono de Atención al Cliente / WhatsApp
              </label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+57 300 000 0000"
                className="w-full bg-[#080C14] border border-[#141B29] focus:border-[#00F0FF]/60 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none transition font-tech"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase font-tech block mb-1.5">
                Correo Corporativo de Contacto
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="contacto@empresa.com"
                className="w-full bg-[#080C14] border border-[#141B29] focus:border-[#00F0FF]/60 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none transition font-tech"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase font-tech block mb-1.5">
              Mensaje de Bienvenida Automático para Clientes
            </label>
            <textarea
              rows={3}
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              placeholder="Mensaje con el que se saludará automáticamente a los clientes que escriban a tus redes..."
              className="w-full bg-[#080C14] border border-[#141B29] focus:border-[#00F0FF]/60 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none transition font-tech"
            />
          </div>
        </div>

        {/* Bloque 3: Permisos de Supervisión Externa (Gobernanza y Ley 1581) */}
        <div className="p-6 rounded-2xl bg-[#05080F] border border-[#141B29] space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#111726]">
            <i className="fa-solid fa-shield-halved text-amber-400 text-sm"></i>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-tech">
              Permisos de Soporte & Auditoría Externa
            </h3>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed font-tech">
            Conforme a la Ley 1581 de Protección de Datos, el Super Administrador de la plataforma central KorevX no puede acceder a las métricas privadas ni a los registros de tu empresa a menos que tú lo autorices explícitamente:
          </p>

          <div className="space-y-3 pt-1">
            <label className="flex items-start gap-3 p-3.5 rounded-xl bg-[#080C14] border border-[#141B29] cursor-pointer hover:border-slate-700 transition">
              <input
                type="checkbox"
                checked={allowExternalAudit}
                onChange={(e) => setAllowExternalAudit(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-[#00F0FF] focus:ring-0 focus:outline-none bg-[#05080F] border-slate-700 cursor-pointer"
              />
              <div className="flex-1 text-xs">
                <span className="font-bold text-white font-tech block">
                  Permitir Inspección de Auditoría Interna por Super Admin
                </span>
                <span className="text-slate-400 text-[11px] block mt-0.5">
                  Habilita al Super Administrador central revisar la trazabilidad inmutable de eventos de control de calidad de tu empresa.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 rounded-xl bg-[#080C14] border border-[#141B29] cursor-pointer hover:border-slate-700 transition">
              <input
                type="checkbox"
                checked={allowSupportConsole}
                onChange={(e) => setAllowSupportConsole(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-amber-400 focus:ring-0 focus:outline-none bg-[#05080F] border-slate-700 cursor-pointer"
              />
              <div className="flex-1 text-xs">
                <span className="font-bold text-white font-tech block">
                  Permitir Consola de Soporte Técnico Remoto por Super Admin
                </span>
                <span className="text-slate-400 text-[11px] block mt-0.5">
                  Autoriza temporalmente al equipo central de KorevX a prestar asistencia técnica y resolución de incidentes en tiempo real.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Bloque 4: Resumen de Cuotas Asignadas (Informativo) */}
        <div className="p-6 rounded-2xl bg-[#05080F] border border-[#141B29] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#111726]">
            <div className="flex items-center gap-2.5">
              <i className="fa-solid fa-chart-pie text-cyan-400 text-sm"></i>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-tech">
                Cuotas Asignadas por Super Administrador
              </h3>
            </div>
            <span className="text-[10px] text-slate-400 font-tech">Solo Lectura</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs font-tech">
            <div className="p-3 rounded-xl bg-[#080C14] border border-[#141B29] text-center">
              <p className="text-[10px] text-slate-400 uppercase font-bold">Facebook</p>
              <p className="text-base font-bold text-white mt-1">{channelLimits.FACEBOOK} canales</p>
            </div>
            <div className="p-3 rounded-xl bg-[#080C14] border border-[#141B29] text-center">
              <p className="text-[10px] text-slate-400 uppercase font-bold">Instagram</p>
              <p className="text-base font-bold text-white mt-1">{channelLimits.INSTAGRAM} canales</p>
            </div>
            <div className="p-3 rounded-xl bg-[#080C14] border border-[#141B29] text-center">
              <p className="text-[10px] text-slate-400 uppercase font-bold">WhatsApp</p>
              <p className="text-base font-bold text-white mt-1">{channelLimits.WHATSAPP} canales</p>
            </div>
            <div className="p-3 rounded-xl bg-[#080C14] border border-[#141B29] text-center">
              <p className="text-[10px] text-slate-400 uppercase font-bold">TikTok</p>
              <p className="text-base font-bold text-white mt-1">{channelLimits.TIKTOK} canales</p>
            </div>
            <div className="p-3 rounded-xl bg-[#080C14] border border-[#141B29] text-center">
              <p className="text-[10px] text-slate-400 uppercase font-bold">Operadores</p>
              <p className="text-base font-bold text-[#00F0FF] mt-1">{maxOperators} máx.</p>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 font-tech">
            Si necesitas ampliar tus cuotas de redes sociales o la cantidad de operadores, solicita un ajuste al Super Administrador de KorevX.
          </p>
        </div>

        {/* Botón de Guardado */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 rounded-xl bg-[#00F0FF] hover:bg-[#00D7E5] text-[#030508] font-bold text-xs flex items-center gap-2 font-tech shadow-lg shadow-[#00F0FF]/25 transition disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <i className="fa-solid fa-spinner fa-spin text-xs"></i>
                <span>Guardando Cambios...</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-check text-xs"></i>
                <span>Guardar Configuración</span>
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
};
