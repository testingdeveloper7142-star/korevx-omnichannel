import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { soundManager } from '../../utils/audio';

export interface ChannelLimits {
  FACEBOOK: number;
  INSTAGRAM: number;
  WHATSAPP: number;
  TIKTOK: number;
}

export interface OperatorItem {
  id: string;
  name: string;
  email: string;
  role: string;
  isOnline: boolean;
  isBlocked: boolean;
  status: 'ACTIVE' | 'BLOCKED';
  assignedCount?: number;
  avgResponseTime?: string;
  avatar?: string;
  createdAt?: string;
}

export interface EnterpriseItem {
  id: string;
  name: string;
  nit?: string;
  industry: string;
  plan?: string;
  activeChannels: string[];
  channelLimits?: ChannelLimits;
  operatorCount: number;
  maxOperators?: number;
  users?: OperatorItem[];
  monthlyApiRequests: number;
  quotaLimit: number;
  storageMb: number;
  slaPercent: number;
  lastActive: string;
  location: string;
  techLead: string;
  adminId?: string;
  adminEmail?: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL' | 'MAINTENANCE';
  createdAt?: string;
}

export const EnterprisesManagerDashboard: React.FC = () => {
  const [enterprises, setEnterprises] = useState<EnterpriseItem[]>(() => {
    try {
      const saved = localStorage.getItem('korevx_custom_enterprises');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal de Creación
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [createSuccessData, setCreateSuccessData] = useState<any | null>(null);

  // Formulario de Creación con cuotas directas
  const [formData, setFormData] = useState({
    name: '',
    nit: '',
    industry: 'Retail & E-commerce',
    quotaLimit: 50000,
    maxOperators: 5,
    location: 'Bogotá, Colombia',
    adminFullName: '',
    adminEmail: '',
    channelLimits: {
      FACEBOOK: 2,
      INSTAGRAM: 1,
      WHATSAPP: 1,
      TIKTOK: 0,
    } as ChannelLimits,
  });

  // Modal para editar límites de redes sociales y operadores
  const [enterpriseForLimits, setEnterpriseForLimits] = useState<EnterpriseItem | null>(null);
  const [editingLimits, setEditingLimits] = useState<ChannelLimits>({
    FACEBOOK: 2,
    INSTAGRAM: 1,
    WHATSAPP: 1,
    TIKTOK: 0,
  });
  const [editingMaxOperators, setEditingMaxOperators] = useState<number>(5);
  const [isUpdatingLimits, setIsUpdatingLimits] = useState(false);

  // Modal y estado para editar Administrador (Nombre y Correo)
  const [enterpriseForAdminEdit, setEnterpriseForAdminEdit] = useState<EnterpriseItem | null>(null);
  const [editingAdminName, setEditingAdminName] = useState('');
  const [editingAdminEmail, setEditingAdminEmail] = useState('');
  const [isUpdatingAdmin, setIsUpdatingAdmin] = useState(false);
  const [adminEditError, setAdminEditError] = useState<string | null>(null);

  // Modal y estado para eliminar empresa
  const [enterpriseToDelete, setEnterpriseToDelete] = useState<EnterpriseItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modal y estado para restablecer contraseña
  const [adminToReset, setAdminToReset] = useState<{ id?: string; email: string; name: string; enterpriseName: string } | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  // Modal y gestión de Operadores por Empresa
  const [selectedEnterpriseForOperators, setSelectedEnterpriseForOperators] = useState<EnterpriseItem | null>(null);
  const [enterpriseOperatorsList, setEnterpriseOperatorsList] = useState<OperatorItem[]>([]);
  const [isLoadingOperators, setIsLoadingOperators] = useState(false);
  const [operatorActionMessage, setOperatorActionMessage] = useState<string | null>(null);

  // Cargar empresas desde backend
  const fetchEnterprises = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get('/api/v1/enterprises');
      if (res.data && Array.isArray(res.data)) {
        let customAdmins: any[] = [];
        try {
          const savedAdmins = localStorage.getItem('korevx_registered_admins');
          customAdmins = savedAdmins ? JSON.parse(savedAdmins) : [];
        } catch {}

        const mapped: EnterpriseItem[] = res.data.map((item: any) => {
          const matchAdmin = customAdmins.find((a: any) => a.workspaceId === item.id);
          
          // Recuperar límites guardados localmente si existen
          let savedLimits: ChannelLimits = { FACEBOOK: 2, INSTAGRAM: 1, WHATSAPP: 1, TIKTOK: 0 };
          try {
            const l = localStorage.getItem(`korevx_channel_limits_${item.id}`);
            if (l) savedLimits = JSON.parse(l);
          } catch {}

          const effectiveLimits = item.channelLimits || savedLimits;

          let savedMaxOps = 5;
          try {
            const m = localStorage.getItem(`korevx_max_operators_${item.id}`);
            if (m) savedMaxOps = parseInt(m, 10);
          } catch {}
          const effectiveMaxOps = item.maxOperators !== undefined ? item.maxOperators : savedMaxOps;
          // Recuperar canales locales si existen
          let activeChannels = Array.isArray(item.activeChannels) ? item.activeChannels : [];
          try {
            const chanStr = localStorage.getItem(`korevx_channels_${item.id}`);
            if (chanStr) {
              const chList = JSON.parse(chanStr);
              if (Array.isArray(chList)) {
                activeChannels = Array.from(new Set([...activeChannels, ...chList.map((c: any) => c.platform)]));
              }
            }
          } catch {}

          return {
            ...item,
            status: item.status || 'ACTIVE',
            users: item.users || [],
            activeChannels,
            channelLimits: effectiveLimits,
            maxOperators: effectiveMaxOps,
            adminId: item.adminId || matchAdmin?.id,
            adminEmail: item.adminEmail || matchAdmin?.email || 'admin@' + (item.slug || 'empresa') + '.com',
            techLead: item.techLead || matchAdmin?.fullName || 'Administrador',
          };
        });

        // Combinar con empresas creadas localmente para no perderlas entre pestañas
        let merged = mapped;
        try {
          const savedEntsStr = localStorage.getItem('korevx_custom_enterprises');
          if (savedEntsStr) {
            const existingLocal = JSON.parse(savedEntsStr);
            if (Array.isArray(existingLocal)) {
              const localOnly = existingLocal.filter((le: any) => !mapped.some((me) => me.id === le.id));
              merged = [...mapped, ...localOnly];
            }
          }
        } catch {}

        setEnterprises(merged);
        try {
          localStorage.setItem('korevx_custom_enterprises', JSON.stringify(merged));
        } catch {}
      }
    } catch (err) {
      console.warn('Backend listEnterprises offline, usando localStorage');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEnterprises();
    const interval = setInterval(fetchEnterprises, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleEnterpriseStatus = async (ent: EnterpriseItem) => {
    if (ent.id === 'b2d78f5f-95e6-4191-8ec6-a958e8c10bbc') {
      soundManager.playWarning();
      alert('No es posible suspender la sede central KorevX Global.');
      return;
    }
    const newStatus: 'ACTIVE' | 'SUSPENDED' = ent.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    const confirmMsg = newStatus === 'SUSPENDED'
      ? `¿Estás seguro de BLOQUEAR y SUSPENDER el acceso a la empresa "${ent.name}"?\n\nNingún usuario (ni administradores ni operadores) de esta empresa podrá iniciar sesión mientras esté suspendida.`
      : `¿Reactivar el acceso a la empresa "${ent.name}"?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await axios.patch(`/api/v1/enterprises/${ent.id}/status`, { status: newStatus });
      setEnterprises((prev) =>
        prev.map((item) => (item.id === ent.id ? { ...item, status: newStatus } : item))
      );
      soundManager.playSuccess();
      fetchEnterprises();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error actualizando estado de la empresa');
    }
  };

  const handleOpenOperatorsModal = async (ent: EnterpriseItem) => {
    setSelectedEnterpriseForOperators(ent);
    setOperatorActionMessage(null);
    setIsLoadingOperators(true);
    try {
      const res = await axios.get(`/api/v1/enterprises/${ent.id}/operators`);
      if (Array.isArray(res.data) && res.data.length > 0) {
        setEnterpriseOperatorsList(res.data);
      } else if (ent.users && ent.users.length > 0) {
        setEnterpriseOperatorsList(ent.users);
      } else {
        const localAgentsStr = localStorage.getItem(`korevx_agents_${ent.id}`);
        if (localAgentsStr) {
          try {
            const list = JSON.parse(localAgentsStr);
            setEnterpriseOperatorsList(
              list.map((a: any) => ({
                id: a.id,
                name: a.name,
                email: a.email,
                role: a.role || 'Operador',
                isOnline: !!a.isOnline,
                isBlocked: !!a.isBlocked,
                status: a.isBlocked ? 'BLOCKED' : 'ACTIVE',
              }))
            );
          } catch {}
        } else {
          setEnterpriseOperatorsList([]);
        }
      }
    } catch {
      if (ent.users && ent.users.length > 0) {
        setEnterpriseOperatorsList(ent.users);
      } else {
        const localAgentsStr = localStorage.getItem(`korevx_agents_${ent.id}`);
        if (localAgentsStr) {
          try {
            const list = JSON.parse(localAgentsStr);
            setEnterpriseOperatorsList(
              list.map((a: any) => ({
                id: a.id,
                name: a.name,
                email: a.email,
                role: a.role || 'Operador',
                isOnline: !!a.isOnline,
                isBlocked: !!a.isBlocked,
                status: a.isBlocked ? 'BLOCKED' : 'ACTIVE',
              }))
            );
          } catch {}
        } else {
          setEnterpriseOperatorsList([]);
        }
      }
    } finally {
      setIsLoadingOperators(false);
    }
  };

  const handleToggleOperatorBlock = async (op: OperatorItem) => {
    if (!selectedEnterpriseForOperators) return;
    const newBlocked = !op.isBlocked;
    try {
      await axios.patch(`/api/v1/enterprises/${selectedEnterpriseForOperators.id}/operators/${op.id}/status`, {
        isBlocked: newBlocked,
      });
      setEnterpriseOperatorsList((prev) =>
        prev.map((item) =>
          item.id === op.id ? { ...item, isBlocked: newBlocked, status: newBlocked ? 'BLOCKED' : 'ACTIVE' } : item
        )
      );
      setOperatorActionMessage(`Acceso de "${op.name}" ${newBlocked ? 'BLOQUEADO' : 'DESBLOQUEADO'} exitosamente.`);
      soundManager.playSuccess();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error actualizando estado del operador');
    }
  };

  const handleResetOperatorPassword = async (op: OperatorItem) => {
    try {
      await axios.patch(`/api/v1/auth/reset-password/${op.id}`);
      setOperatorActionMessage(`Contraseña restablecida a 123456789 para "${op.name}" (${op.email}). Cambio obligatorio.`);
      soundManager.playSuccess();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al restablecer contraseña');
    }
  };

  const handleDeleteOperator = async (op: OperatorItem) => {
    if (!selectedEnterpriseForOperators) return;
    if (!window.confirm(`¿Confirmas la eliminación del operador "${op.name}" (${op.email}) de la plataforma?`)) return;

    try {
      await axios.delete(`/api/v1/enterprises/${selectedEnterpriseForOperators.id}/operators/${op.id}`);
      setEnterpriseOperatorsList((prev) => prev.filter((item) => item.id !== op.id));
      try {
        const localAgentsStr = localStorage.getItem(`korevx_agents_${selectedEnterpriseForOperators.id}`);
        if (localAgentsStr) {
          const list = JSON.parse(localAgentsStr);
          localStorage.setItem(
            `korevx_agents_${selectedEnterpriseForOperators.id}`,
            JSON.stringify(list.filter((a: any) => a.id !== op.id))
          );
        }
      } catch {}
      setOperatorActionMessage(`Operador "${op.name}" eliminado definitivamente.`);
      soundManager.playWarning();
      fetchEnterprises();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al eliminar operador');
    }
  };

  const handleCreateEnterprise = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const emailTrimmed = formData.adminEmail.toLowerCase().trim();
    const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!EMAIL_REGEX.test(emailTrimmed)) {
      setFormError('El formato del correo del administrador no es válido. Debe contener un dominio válido completo (ej: usuario@dominio.com).');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        adminEmail: emailTrimmed,
        adminPassword: '123456789', // Contraseña temporal estándar obligatoria
      };

      let newEnt: EnterpriseItem;
      let newAdmin: any;

      try {
        const res = await axios.post('/api/v1/enterprises', payload);
        newEnt = {
          ...res.data.enterprise,
          channelLimits: formData.channelLimits,
          maxOperators: formData.maxOperators,
        };
        newAdmin = res.data.administrator;
      } catch (backendErr) {
        // Fallback local seguro
        const fakeId = 'ws-' + Date.now();
        const fakeAdminId = 'usr-' + Date.now();
        newEnt = {
          id: fakeId,
          name: formData.name,
          nit: formData.nit || 'En trámite',
          industry: formData.industry,
          plan: 'Empresarial',
          activeChannels: [], // Canales estrictamente vacíos
          channelLimits: formData.channelLimits,
          operatorCount: 1,
          maxOperators: formData.maxOperators,
          monthlyApiRequests: 0,
          quotaLimit: formData.quotaLimit,
          storageMb: 10,
          slaPercent: 100,
          lastActive: 'Recién creada',
          location: formData.location,
          techLead: formData.adminFullName,
          adminId: fakeAdminId,
          adminEmail: formData.adminEmail.toLowerCase().trim(),
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
        };

        newAdmin = {
          id: fakeAdminId,
          email: formData.adminEmail.toLowerCase().trim(),
          fullName: formData.adminFullName,
          role: 'ADMIN',
          workspaceId: fakeId,
          workspaceName: formData.name,
          initialPassword: '123456789',
        };
      }

      // Asegurar canales vacíos para este workspace
      localStorage.setItem(`korevx_channels_${newEnt.id}`, JSON.stringify([]));

      // Guardar límites de canales para este workspace
      localStorage.setItem(`korevx_channel_limits_${newEnt.id}`, JSON.stringify(formData.channelLimits));

      // Guardar límite de operadores para este workspace
      localStorage.setItem(`korevx_max_operators_${newEnt.id}`, String(formData.maxOperators));

      // Guardar en localStorage de empresas creadas
      const savedEnts = localStorage.getItem('korevx_custom_enterprises');
      const customEntList = savedEnts ? JSON.parse(savedEnts) : [];
      customEntList.unshift(newEnt);
      localStorage.setItem('korevx_custom_enterprises', JSON.stringify(customEntList));

      // Registrar administrador para login
      const savedAdmins = localStorage.getItem('korevx_registered_admins');
      const adminList = savedAdmins ? JSON.parse(savedAdmins) : [];
      adminList.unshift(newAdmin);
      localStorage.setItem('korevx_registered_admins', JSON.stringify(adminList));

      // Notificación de auditoría global
      const savedNotifs = localStorage.getItem('korevx_notifications');
      const notifs = savedNotifs ? JSON.parse(savedNotifs) : [];
      notifs.unshift({
        id: 'notif-' + Date.now(),
        title: '🏢 Nueva Empresa Registrada',
        message: `Se dio de alta a "${newEnt.name}" con límites: FB:${formData.channelLimits.FACEBOOK}, IG:${formData.channelLimits.INSTAGRAM}, WA:${formData.channelLimits.WHATSAPP}, TT:${formData.channelLimits.TIKTOK}. Admin: ${newAdmin.email}.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'audit',
        read: false,
      });
      localStorage.setItem('korevx_notifications', JSON.stringify(notifs));

      setEnterprises((prev) => [newEnt, ...prev]);
      soundManager.playNotification();
      setCreateSuccessData({ enterprise: newEnt, administrator: newAdmin });
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'Error al crear la empresa');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveLimits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enterpriseForLimits) return;
    setIsUpdatingLimits(true);

    try {
      try {
        await axios.patch(`/api/v1/enterprises/${enterpriseForLimits.id}/channel-limits`, {
          channelLimits: editingLimits,
        });
      } catch (err) {
        console.warn('Backend updateChannelLimits offline, guardando localmente');
      }

      try {
        await axios.patch(`/api/v1/enterprises/${enterpriseForLimits.id}/operator-limit`, {
          maxOperators: editingMaxOperators,
        });
      } catch (err) {
        console.warn('Backend updateMaxOperators offline, guardando localmente');
      }

      // Guardar límites localmente para este workspace
      localStorage.setItem(`korevx_channel_limits_${enterpriseForLimits.id}`, JSON.stringify(editingLimits));
      localStorage.setItem(`korevx_max_operators_${enterpriseForLimits.id}`, String(editingMaxOperators));

      // Actualizar estado en vivo
      setEnterprises((prev) =>
        prev.map((e) =>
          e.id === enterpriseForLimits.id
            ? { ...e, channelLimits: editingLimits, maxOperators: editingMaxOperators }
            : e
        )
      );

      // Guardar en custom_enterprises
      const savedEnts = localStorage.getItem('korevx_custom_enterprises');
      if (savedEnts) {
        try {
          const list = JSON.parse(savedEnts);
          const updated = list.map((e: any) =>
            e.id === enterpriseForLimits.id
              ? { ...e, channelLimits: editingLimits, maxOperators: editingMaxOperators }
              : e
          );
          localStorage.setItem('korevx_custom_enterprises', JSON.stringify(updated));
        } catch {}
      }

      soundManager.playSuccess();
      setEnterpriseForLimits(null);
    } finally {
      setIsUpdatingLimits(false);
    }
  };

  const handleOpenAdminEdit = (ent: EnterpriseItem) => {
    setEnterpriseForAdminEdit(ent);
    setEditingAdminName(ent.techLead || '');
    setEditingAdminEmail(ent.adminEmail || '');
    setAdminEditError(null);
  };

  const handleSaveAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enterpriseForAdminEdit) return;
    setIsUpdatingAdmin(true);
    setAdminEditError(null);

    const trimmedName = editingAdminName.trim();
    const trimmedEmail = editingAdminEmail.toLowerCase().trim();

    if (!trimmedName || !trimmedEmail) {
      setAdminEditError('El nombre completo y el correo electrónico son obligatorios.');
      setIsUpdatingAdmin(false);
      return;
    }

    const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setAdminEditError('El formato de correo no es válido. Debe contener un dominio válido completo (ej: usuario@dominio.com).');
      setIsUpdatingAdmin(false);
      return;
    }

    try {
      try {
        await axios.patch(`/api/v1/enterprises/${enterpriseForAdminEdit.id}/admin`, {
          adminFullName: trimmedName,
          adminEmail: trimmedEmail,
        });
      } catch (err: any) {
        console.warn('Backend updateAdmin offline, aplicando en localStorage');
        if (err.response?.data?.message) {
          throw new Error(err.response.data.message);
        }
      }

      // Actualizar estado reactivo
      setEnterprises((prev) =>
        prev.map((e) =>
          e.id === enterpriseForAdminEdit.id
            ? { ...e, techLead: trimmedName, adminEmail: trimmedEmail }
            : e
        )
      );

      // Actualizar en custom_enterprises
      const savedEnts = localStorage.getItem('korevx_custom_enterprises');
      if (savedEnts) {
        try {
          const list = JSON.parse(savedEnts);
          const updated = list.map((e: any) =>
            e.id === enterpriseForAdminEdit.id
              ? { ...e, techLead: trimmedName, adminEmail: trimmedEmail }
              : e
          );
          localStorage.setItem('korevx_custom_enterprises', JSON.stringify(updated));
        } catch {}
      }

      // Actualizar en korevx_registered_admins
      const savedAdmins = localStorage.getItem('korevx_registered_admins');
      if (savedAdmins) {
        try {
          const list = JSON.parse(savedAdmins);
          const updated = list.map((a: any) =>
            a.workspaceId === enterpriseForAdminEdit.id || (enterpriseForAdminEdit.adminId && a.id === enterpriseForAdminEdit.adminId)
              ? { ...a, fullName: trimmedName, email: trimmedEmail }
              : a
          );
          localStorage.setItem('korevx_registered_admins', JSON.stringify(updated));
        } catch {}
      }

      // Notificación de auditoría
      const savedNotifs = localStorage.getItem('korevx_notifications');
      const notifs = savedNotifs ? JSON.parse(savedNotifs) : [];
      notifs.unshift({
        id: 'notif-' + Date.now(),
        title: '👤 Administrador Actualizado',
        message: `Los datos del administrador para "${enterpriseForAdminEdit.name}" fueron actualizados a: ${trimmedName} (${trimmedEmail}) por Super Admin.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'audit',
        read: false,
      });
      localStorage.setItem('korevx_notifications', JSON.stringify(notifs));

      soundManager.playSuccess();
      setEnterpriseForAdminEdit(null);
    } catch (err: any) {
      setAdminEditError(err.message || 'Error al actualizar los datos del administrador.');
    } finally {
      setIsUpdatingAdmin(false);
    }
  };

  const handleResetPassword = async () => {
    if (!adminToReset) return;
    setIsResetting(true);
    setResetSuccessMessage(null);

    try {
      if (adminToReset.id) {
        try {
          await axios.patch(`/api/v1/auth/reset-password/${adminToReset.id}`);
        } catch (err) {
          console.warn('Backend reset password offline, aplicando en localStorage');
        }
      }

      const savedAdmins = localStorage.getItem('korevx_registered_admins');
      if (savedAdmins) {
        try {
          const list = JSON.parse(savedAdmins);
          const updated = list.map((a: any) =>
            a.email.toLowerCase() === adminToReset.email.toLowerCase()
              ? { ...a, initialPassword: '123456789' }
              : a
          );
          localStorage.setItem('korevx_registered_admins', JSON.stringify(updated));
        } catch {}
      }

      const savedNotifs = localStorage.getItem('korevx_notifications');
      const notifs = savedNotifs ? JSON.parse(savedNotifs) : [];
      notifs.unshift({
        id: 'notif-' + Date.now(),
        title: '🔑 Contraseña Restablecida',
        message: `La contraseña del administrador ${adminToReset.email} fue restablecida a 123456789 por Super Admin. Deberá cambiarla al ingresar.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'audit',
        read: false,
      });
      localStorage.setItem('korevx_notifications', JSON.stringify(notifs));

      soundManager.playNotification();
      setResetSuccessMessage(`La contraseña de ${adminToReset.email} ha sido restablecida a 123456789 exitosamente. El usuario deberá cambiarla obligatoriamente en su próximo inicio de sesión.`);
    } catch (err: any) {
      alert('Error restableciendo contraseña: ' + err.message);
    } finally {
      setIsResetting(false);
    }
  };

  const handleDeleteEnterprise = async (ent: EnterpriseItem) => {
    if (ent.id === 'b2d78f5f-95e6-4191-8ec6-a958e8c10bbc') {
      soundManager.playWarning();
      alert('No es posible eliminar la sede central (KorevX Global), ya que es el núcleo del sistema.');
      setEnterpriseToDelete(null);
      return;
    }

    setIsDeleting(true);
    try {
      try {
        await axios.delete(`/api/v1/enterprises/${ent.id}`);
      } catch (err) {
        console.warn('Backend deleteEnterprise offline:', err);
      }

      setEnterprises((prev) => prev.filter((e) => e.id !== ent.id));

      const saved = localStorage.getItem('korevx_custom_enterprises');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const updated = parsed.filter((e: any) => e.id !== ent.id);
          localStorage.setItem('korevx_custom_enterprises', JSON.stringify(updated));
        } catch {}
      }

      localStorage.removeItem(`korevx_conversations_${ent.id}`);
      localStorage.removeItem(`korevx_channels_${ent.id}`);
      localStorage.removeItem(`korevx_channel_limits_${ent.id}`);
      localStorage.removeItem(`korevx_agents_${ent.id}`);

      soundManager.playWarning();
      setEnterpriseToDelete(null);
    } catch (err: any) {
      alert('Error eliminando la empresa: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePurgeAllData = async () => {
    const confirmation = window.prompt(
      '⚠️ ACCIÓN CRÍTICA DE SUPER ADMIN:\n\n¿Estás seguro de restablecer por completo la plataforma? Esto borrará TODAS las empresas, operadores, canales de redes sociales y conversaciones, conservando ÚNICAMENTE tu cuenta de Super Admin (superadmin@korevx.com).\n\nPara confirmar, escribe "ELIMINAR TODO":'
    );

    if (confirmation !== 'ELIMINAR TODO') {
      if (confirmation !== null) {
        alert('Confirmación cancelada o texto no coincide.');
      }
      return;
    }

    setIsPurging(true);
    try {
      try {
        await axios.post('/api/v1/enterprises/purge-all');
      } catch (err) {
        console.warn('Backend purge-all offline, ejecutando purga local');
      }

      // Preservar usuario actual (Super Admin)
      const authUserStr = localStorage.getItem('korevx_auth_user');
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k !== 'korevx_auth_user') {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));

      if (authUserStr) {
        localStorage.setItem('korevx_auth_user', authUserStr);
      }

      setEnterprises([]);
      soundManager.playSuccess();
      alert('Limpieza total completada. Todas las empresas y datos han sido eliminados. Solo se conserva el Super Administrador.');
      window.location.reload();
    } catch (err: any) {
      alert(`Error durante la purga: ${err.message || 'Error desconocido'}`);
    } finally {
      setIsPurging(false);
    }
  };

  const filtered = enterprises.filter((ent) => {
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        ent.name.toLowerCase().includes(q) ||
        (ent.adminEmail && ent.adminEmail.toLowerCase().includes(q)) ||
        (ent.techLead && ent.techLead.toLowerCase().includes(q)) ||
        ent.industry.toLowerCase().includes(q) ||
        (ent.nit && ent.nit.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <section className="flex-1 flex flex-col h-full overflow-y-auto bg-[#030508] p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Cabecera Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#111726]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-[#00F0FF]/15 border border-[#00F0FF]/30 text-[#00F0FF] flex items-center justify-center text-sm shadow-sm shadow-[#00F0FF]/20">
              <i className="fa-solid fa-building-user"></i>
            </span>
            <h2 className="text-xl font-bold text-white font-tech tracking-wide">
              Empresas y Administradores
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-[#00F0FF]/15 text-[#00F0FF] text-[10px] font-bold border border-[#00F0FF]/30 font-tech">
              Super Admin
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Gestión de inquilinos (Tenants) con aislamiento total y control granular de límites por red social.
          </p>
        </div>

        {/* Botones de Acción Super Admin */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handlePurgeAllData}
            disabled={isPurging}
            className="px-4 py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 font-bold text-xs flex items-center justify-center gap-2 transition font-tech shadow-md shadow-rose-950/40 disabled:opacity-50"
            title="Borrar todas las empresas, operadores, canales y conversaciones. Conserva únicamente tu Super Administrador."
          >
            <i className={`fa-solid ${isPurging ? 'fa-spinner fa-spin' : 'fa-triangle-exclamation'} text-xs text-rose-400`}></i>
            <span>Limpieza Total del Sistema</span>
          </button>

          <button
            onClick={() => {
              setFormData({
                name: '',
                nit: '',
                industry: 'Retail & E-commerce',
                quotaLimit: 50000,
                maxOperators: 5,
                location: 'Bogotá, Colombia',
                adminFullName: '',
                adminEmail: '',
                channelLimits: {
                  FACEBOOK: 2,
                  INSTAGRAM: 1,
                  WHATSAPP: 1,
                  TIKTOK: 0,
                },
              });
              setFormError(null);
              setCreateSuccessData(null);
              setIsCreateModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00F0FF] to-[#0072FF] hover:from-[#00D7E5] hover:to-[#005ecc] text-[#030508] font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-[#00F0FF]/25 font-tech tracking-wide"
          >
            <i className="fa-solid fa-plus text-xs"></i>
            <span>Nueva Empresa y Administrador</span>
          </button>
        </div>
      </div>

      {/* Regla de Gobernanza y Privacidad */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/20 via-blue-950/20 to-purple-950/20 border border-cyan-500/30 flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0 mt-0.5">
          <i className="fa-solid fa-shield-halved text-sm"></i>
        </div>
        <div className="text-xs space-y-1">
          <p className="font-bold text-white font-tech">
            Aislamiento Multi-Tenant & Cuotas Independientes
          </p>
          <p className="text-slate-300 leading-relaxed">
            Puedes configurar límites personalizados por red social para cada empresa (ej. Empresa A: 2 Facebook; Empresa B: 1 Instagram, 1 Facebook, 1 WhatsApp).
            Los canales inician en <strong>0 cuentas</strong> hasta que el administrador conecte las suyas respetando su cuota máxima.
          </p>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#05080F] p-3 rounded-2xl border border-[#111726]">
        <div className="relative w-full sm:w-80">
          <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-3 text-slate-500 text-xs"></i>
          <input
            type="text"
            placeholder="Buscar por empresa, correo o admin..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-[#080C14] border border-[#141B29] focus:border-[#00F0FF]/50 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-400 font-tech">
            Total Empresas: <strong className="text-[#00F0FF]">{filtered.length}</strong>
          </span>
        </div>
      </div>

      {/* Lista de Empresas */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#05080F] border border-[#111726]">
          <i className="fa-solid fa-building-circle-xmark text-3xl text-slate-600 mb-2"></i>
          <p className="text-sm font-semibold text-slate-400">No se encontraron empresas registradas</p>
          <p className="text-xs text-slate-600 mt-1">Haz clic en "+ Nueva Empresa y Administrador" para dar de alta una nueva organización con sus cuotas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((ent) => {
            const localChannelsStr = localStorage.getItem(`korevx_channels_${ent.id}`);
            let localChanCount = 0;
            if (localChannelsStr) {
              try {
                const parsed = JSON.parse(localChannelsStr);
                if (Array.isArray(parsed)) localChanCount = parsed.length;
              } catch {}
            }
            const channelCount = Math.max(
              Array.isArray(ent.activeChannels) ? ent.activeChannels.length : 0,
              localChanCount
            );
            const limits = ent.channelLimits || { FACEBOOK: 2, INSTAGRAM: 1, WHATSAPP: 1, TIKTOK: 0 };

            return (
              <div
                key={ent.id}
                className="bg-[#05080F] border border-[#111726] hover:border-[#00F0FF]/30 rounded-2xl p-5 flex flex-col justify-between transition group shadow-lg shadow-black/40"
              >
                <div>
                  {/* Encabezado de la Tarjeta */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0E1524] to-[#162032] border border-[#1C2A44] flex items-center justify-center text-[#00F0FF] text-base font-bold font-tech shadow-sm">
                        {ent.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white group-hover:text-[#00F0FF] transition">
                          {ent.name}
                        </h3>
                        <p className="text-[11px] text-slate-400 font-tech">
                          NIT: {ent.nit || 'En trámite'} • {ent.industry}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-tech border flex items-center gap-1 ${
                        ent.status === 'SUSPENDED'
                          ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                          : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${ent.status === 'SUSPENDED' ? 'bg-rose-400' : 'bg-emerald-400'}`}></span>
                        <span>{ent.status === 'SUSPENDED' ? 'Suspendida' : 'Activa'}</span>
                      </span>

                      {ent.id !== 'b2d78f5f-95e6-4191-8ec6-a958e8c10bbc' && (
                        <button
                          onClick={() => handleToggleEnterpriseStatus(ent)}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-tech font-bold border transition flex items-center gap-1 ${
                            ent.status === 'SUSPENDED'
                              ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30'
                          }`}
                          title={ent.status === 'SUSPENDED' ? 'Reactivar acceso a toda la empresa' : 'Bloquear acceso a toda la empresa'}
                        >
                          <i className={`fa-solid ${ent.status === 'SUSPENDED' ? 'fa-lock-open' : 'fa-ban'} text-[9px]`}></i>
                          <span>{ent.status === 'SUSPENDED' ? 'Reactivar' : 'Bloquear'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Datos del Administrador */}
                  <div className="my-3 p-3 rounded-xl bg-[#080C14] border border-[#141B29] space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 flex items-center gap-1.5 font-tech">
                        <i className="fa-solid fa-user-shield text-amber-400"></i>
                        <span>Administrador:</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <strong className="text-white font-medium">{ent.techLead}</strong>
                        <button
                          onClick={() => handleOpenAdminEdit(ent)}
                          className="px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-tech font-bold flex items-center gap-1 transition"
                          title="Modificar nombre y correo del administrador"
                        >
                          <i className="fa-solid fa-pen-to-square text-[9px]"></i>
                          <span>Editar</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 flex items-center gap-1.5 font-tech">
                        <i className="fa-solid fa-envelope text-slate-500"></i>
                        <span>Correo:</span>
                      </span>
                      <span className="text-slate-300 font-mono text-[10px]">{ent.adminEmail}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 flex items-center gap-1.5 font-tech">
                        <i className="fa-solid fa-key text-slate-500"></i>
                        <span>Contraseña Inicial:</span>
                      </span>
                      <span className="text-amber-400 text-[10px] font-tech font-semibold">
                        123456789 (Obliga cambio)
                      </span>
                    </div>
                  </div>

                  {/* Límites de Redes Sociales Asignados */}
                  <div className="p-3 rounded-xl bg-[#080C14] border border-[#141B29] my-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-slate-400 font-tech uppercase font-bold flex items-center gap-1.5">
                        <i className="fa-solid fa-sliders text-[#00F0FF]"></i>
                        <span>Cuotas de Redes Sociales & Operadores</span>
                      </span>
                      <button
                        onClick={() => {
                          setEnterpriseForLimits(ent);
                          setEditingLimits({
                            FACEBOOK: limits.FACEBOOK ?? 1,
                            INSTAGRAM: limits.INSTAGRAM ?? 1,
                            WHATSAPP: limits.WHATSAPP ?? 1,
                            TIKTOK: limits.TIKTOK ?? 0,
                          });
                          setEditingMaxOperators(ent.maxOperators || 5);
                        }}
                        className="text-[10px] text-[#00F0FF] hover:underline font-tech font-bold flex items-center gap-1"
                      >
                        <i className="fa-solid fa-pen-to-square text-[9px]"></i>
                        <span>Ajustar Cuotas</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 text-center font-tech text-[10px]">
                      <div className="p-1.5 rounded-lg bg-[#05080F] border border-[#141B29]">
                        <span className="block text-slate-400 text-[9px] mb-0.5">Facebook</span>
                        <span className="font-bold text-[#1877F2] text-xs">{limits.FACEBOOK}</span>
                      </div>
                      <div className="p-1.5 rounded-lg bg-[#05080F] border border-[#141B29]">
                        <span className="block text-slate-400 text-[9px] mb-0.5">Instagram</span>
                        <span className="font-bold text-rose-400 text-xs">{limits.INSTAGRAM}</span>
                      </div>
                      <div className="p-1.5 rounded-lg bg-[#05080F] border border-[#141B29]">
                        <span className="block text-slate-400 text-[9px] mb-0.5">WhatsApp</span>
                        <span className="font-bold text-emerald-400 text-xs">{limits.WHATSAPP}</span>
                      </div>
                      <div className="p-1.5 rounded-lg bg-[#05080F] border border-[#141B29]">
                        <span className="block text-slate-400 text-[9px] mb-0.5">TikTok</span>
                        <span className={`font-bold text-xs ${limits.TIKTOK > 0 ? 'text-cyan-400' : 'text-slate-600'}`}>
                          {limits.TIKTOK}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Telemetría: Canales Conectados vs Creados */}
                  <div className="grid grid-cols-2 gap-2 my-2">
                    <div className="p-2 rounded-xl bg-[#080C14] border border-[#141B29] text-center">
                      <span className="text-[10px] text-slate-400 font-tech uppercase block">
                        Canales Conectados
                      </span>
                      <span className={`text-xs font-bold font-tech ${channelCount === 0 ? 'text-slate-500' : 'text-[#00F0FF]'}`}>
                        {channelCount === 0 ? '0 Canales (Limpio)' : `${channelCount} Conectados`}
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-[#080C14] border border-[#141B29] text-center flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 font-tech uppercase block">
                          Límite de Operadores
                        </span>
                        <span className="text-xs font-bold text-white font-tech">
                          {ent.operatorCount || 0} / {ent.maxOperators || 5}
                        </span>
                      </div>
                      <button
                        onClick={() => handleOpenOperatorsModal(ent)}
                        className="mt-1 w-full py-1 rounded-lg bg-[#00F0FF]/10 hover:bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/30 text-[10px] font-tech font-bold flex items-center justify-center gap-1 transition"
                        title="Ver operarios, restablecer contraseñas, bloquear o eliminar"
                      >
                        <i className="fa-solid fa-users-gear text-[9px]"></i>
                        <span>Gestionar Operadores</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Acciones de Gobernanza */}
                <div className="pt-3 border-t border-[#111726] flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      setAdminToReset({
                        id: ent.adminId,
                        email: ent.adminEmail || 'admin@korevx.com',
                        name: ent.techLead,
                        enterpriseName: ent.name,
                      });
                      setResetSuccessMessage(null);
                    }}
                    title="Restablecer contraseña del Administrador a 123456789"
                    className="flex-1 py-1.5 px-2.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition font-tech"
                  >
                    <i className="fa-solid fa-rotate-left text-xs"></i>
                    <span>Restablecer Clave (123456789)</span>
                  </button>

                  {ent.id !== 'b2d78f5f-95e6-4191-8ec6-a958e8c10bbc' && (
                    <button
                      onClick={() => setEnterpriseToDelete(ent)}
                      title="Eliminar Empresa y su Entorno Aislado"
                      className="w-8 h-8 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center text-xs transition"
                    >
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal para Ajustar Límites de Redes Sociales (Portal) */}
      {enterpriseForLimits &&
        createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <div className="bg-[#05080F] border border-[#00F0FF]/40 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl shadow-cyan-950/50 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#141B29]">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-2xl bg-[#00F0FF]/15 border border-[#00F0FF]/30 text-[#00F0FF] flex items-center justify-center text-base">
                    <i className="fa-solid fa-sliders"></i>
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-white font-tech">Cuotas de Redes Sociales</h3>
                    <p className="text-[11px] text-[#00F0FF] font-medium">{enterpriseForLimits.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setEnterpriseForLimits(null)}
                  className="w-7 h-7 rounded-lg bg-[#0E1524] text-slate-400 hover:text-white flex items-center justify-center text-xs"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed bg-[#080C14] p-3 rounded-xl border border-[#141B29]">
                Configura cuántas cuentas de cada plataforma puede conectar esta empresa. Si defines <strong>0</strong>, la red social quedará bloqueada en su panel.
              </p>

              <form onSubmit={handleSaveLimits} className="space-y-3 font-tech">
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#080C14] border border-[#141B29]">
                  <div className="flex items-center gap-2.5 text-xs text-white">
                    <span className="w-7 h-7 rounded-lg bg-[#1877F2]/20 text-[#1877F2] flex items-center justify-center">
                      <i className="fa-brands fa-facebook-f"></i>
                    </span>
                    <span>Facebook Messenger & Posts</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={editingLimits.FACEBOOK}
                    onChange={(e) => setEditingLimits({ ...editingLimits, FACEBOOK: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                    className="w-16 px-2.5 py-1.5 bg-[#05080F] border border-[#1E293B] focus:border-[#00F0FF] rounded-lg text-xs text-white text-center font-bold focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-[#080C14] border border-[#141B29]">
                  <div className="flex items-center gap-2.5 text-xs text-white">
                    <span className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                      <i className="fa-brands fa-instagram"></i>
                    </span>
                    <span>Instagram Direct & Comments</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={editingLimits.INSTAGRAM}
                    onChange={(e) => setEditingLimits({ ...editingLimits, INSTAGRAM: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                    className="w-16 px-2.5 py-1.5 bg-[#05080F] border border-[#1E293B] focus:border-[#00F0FF] rounded-lg text-xs text-white text-center font-bold focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-[#080C14] border border-[#141B29]">
                  <div className="flex items-center gap-2.5 text-xs text-white">
                    <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <i className="fa-brands fa-whatsapp"></i>
                    </span>
                    <span>WhatsApp Business API</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={editingLimits.WHATSAPP}
                    onChange={(e) => setEditingLimits({ ...editingLimits, WHATSAPP: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                    className="w-16 px-2.5 py-1.5 bg-[#05080F] border border-[#1E293B] focus:border-[#00F0FF] rounded-lg text-xs text-white text-center font-bold focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-[#080C14] border border-[#141B29]">
                  <div className="flex items-center gap-2.5 text-xs text-white">
                    <span className="w-7 h-7 rounded-lg bg-cyan-500/20 text-[#00F0FF] flex items-center justify-center">
                      <i className="fa-brands fa-tiktok"></i>
                    </span>
                    <span>TikTok Video Comments</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={editingLimits.TIKTOK}
                    onChange={(e) => setEditingLimits({ ...editingLimits, TIKTOK: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                    className="w-16 px-2.5 py-1.5 bg-[#05080F] border border-[#1E293B] focus:border-[#00F0FF] rounded-lg text-xs text-white text-center font-bold focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-[#080C14] border border-[#00F0FF]/30">
                  <div className="flex items-center gap-2.5 text-xs text-white">
                    <span className="w-7 h-7 rounded-lg bg-[#00F0FF]/20 text-[#00F0FF] flex items-center justify-center">
                      <i className="fa-solid fa-users"></i>
                    </span>
                    <div>
                      <span className="font-bold block">Límite de Operadores</span>
                      <span className="text-[10px] text-slate-400">Máximo de agentes que el admin puede crear</span>
                    </div>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={editingMaxOperators}
                    onChange={(e) => setEditingMaxOperators(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-16 px-2.5 py-1.5 bg-[#05080F] border border-[#1E293B] focus:border-[#00F0FF] rounded-lg text-xs text-white text-center font-bold focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setEnterpriseForLimits(null)}
                    className="px-4 py-2 rounded-xl bg-[#0E1524] text-xs font-semibold text-slate-300 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingLimits}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#00F0FF] to-[#0072FF] text-[#030508] font-bold text-xs flex items-center gap-2 shadow-lg shadow-[#00F0FF]/20"
                  >
                    {isUpdatingLimits ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin"></i>
                        <span>Guardando...</span>
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-check"></i>
                        <span>Guardar Cuotas</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Modal para Editar Administrador (Nombre y Correo) (Portal) */}
      {enterpriseForAdminEdit &&
        createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <div className="bg-[#05080F] border border-amber-500/40 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl shadow-amber-950/50 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#141B29]">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center text-base">
                    <i className="fa-solid fa-user-pen"></i>
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-white font-tech">Editar Administrador</h3>
                    <p className="text-[11px] text-amber-400 font-medium">{enterpriseForAdminEdit.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setEnterpriseForAdminEdit(null)}
                  className="w-7 h-7 rounded-lg bg-[#0E1524] text-slate-400 hover:text-white flex items-center justify-center text-xs"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>

              {adminEditError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <i className="fa-solid fa-triangle-exclamation text-rose-400"></i>
                  <span>{adminEditError}</span>
                </div>
              )}

              <form onSubmit={handleSaveAdmin} className="space-y-4 font-tech">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Nombre Completo del Administrador
                  </label>
                  <input
                    type="text"
                    required
                    value={editingAdminName}
                    onChange={(e) => setEditingAdminName(e.target.value)}
                    placeholder="Ej. Carlos Administrador"
                    className="w-full px-3 py-2 bg-[#080C14] border border-[#1E293B] focus:border-amber-400 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Correo Electrónico Corporativo
                  </label>
                  <input
                    type="email"
                    required
                    value={editingAdminEmail}
                    onChange={(e) => setEditingAdminEmail(e.target.value)}
                    placeholder="admin@empresa.com"
                    className="w-full px-3 py-2 bg-[#080C14] border border-[#1E293B] focus:border-amber-400 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Este correo se utilizará para iniciar sesión en la empresa correspondiente.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEnterpriseForAdminEdit(null)}
                    className="px-4 py-2 rounded-xl bg-[#0E1524] text-xs font-semibold text-slate-300 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingAdmin}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20"
                  >
                    {isUpdatingAdmin ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin"></i>
                        <span>Guardando...</span>
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-check"></i>
                        <span>Guardar Cambios</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Modal de Creación de Empresa y Administrador (Portal) */}
      {isCreateModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[99999] flex items-start justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
            <div className="bg-[#05080F] border border-[#1C2A44] rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl shadow-cyan-950/40 space-y-6 my-auto">
              <div className="flex items-center justify-between pb-4 border-b border-[#141B29]">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-2xl bg-[#00F0FF]/15 border border-[#00F0FF]/30 text-[#00F0FF] flex items-center justify-center text-base">
                    <i className="fa-solid fa-building-circle-arrow-right"></i>
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-white font-tech">
                      Dar de Alta Nueva Empresa (Tenant)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Configura el espacio de trabajo, su administrador y las cuotas de redes sociales permitidas
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="w-8 h-8 rounded-xl bg-[#0E1524] text-slate-400 hover:text-white flex items-center justify-center text-xs transition"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>

              {formError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
                  <i className="fa-solid fa-triangle-exclamation text-rose-400"></i>
                  <span>{formError}</span>
                </div>
              )}

              {createSuccessData ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 space-y-2">
                    <div className="flex items-center gap-2 font-bold font-tech text-sm">
                      <i className="fa-solid fa-circle-check text-emerald-400"></i>
                      <span>¡Empresa y Administrador creados exitosamente!</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      El espacio de trabajo <strong className="text-white">{createSuccessData.enterprise.name}</strong> ha sido inicializado con canales limpios (<code className="text-[#00F0FF]">0 canales</code>) y sus cuotas han sido establecidas.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#080C14] border border-[#141B29] space-y-2 text-xs font-mono">
                    <p className="text-[10px] text-amber-400 font-bold uppercase font-tech">Resumen de Cuotas y Acceso:</p>
                    <div className="flex justify-between py-1 border-b border-[#141B29]">
                      <span className="text-slate-400 font-tech">Administrador:</span>
                      <span className="text-white font-bold">{createSuccessData.administrator.fullName}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#141B29]">
                      <span className="text-slate-400 font-tech">Correo de Login:</span>
                      <span className="text-[#00F0FF]">{createSuccessData.administrator.email}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#141B29]">
                      <span className="text-slate-400 font-tech">Contraseña Temporal:</span>
                      <span className="text-amber-400 font-bold">123456789</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400 font-tech">Cuotas de Redes Sociales:</span>
                      <span className="text-white font-tech font-semibold">
                        FB: {formData.channelLimits.FACEBOOK} | IG: {formData.channelLimits.INSTAGRAM} | WA: {formData.channelLimits.WHATSAPP} | TT: {formData.channelLimits.TIKTOK}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreateModalOpen(false);
                        setCreateSuccessData(null);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-[#00F0FF] hover:bg-[#00D7E5] text-[#030508] font-bold text-xs transition font-tech"
                    >
                      Entendido y Cerrar
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCreateEnterprise} className="space-y-4">
                  {/* Bloque 1: Datos de la Empresa */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-[#00F0FF] uppercase tracking-wider font-tech flex items-center gap-2">
                      <i className="fa-solid fa-building"></i>
                      <span>1. Información de la Empresa</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1 font-tech">
                          Razón Social / Nombre Comercial *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ej: Empresa A SAS"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-3 py-2 bg-[#080C14] border border-[#141B29] focus:border-[#00F0FF]/60 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1 font-tech">
                          NIT / Identificador Fiscal
                        </label>
                        <input
                          type="text"
                          placeholder="900.123.456-7"
                          value={formData.nit}
                          onChange={(e) => setFormData({ ...formData, nit: e.target.value })}
                          className="w-full px-3 py-2 bg-[#080C14] border border-[#141B29] focus:border-[#00F0FF]/60 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1 font-tech">
                          Sector / Industria
                        </label>
                        <select
                          value={formData.industry}
                          onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                          className="w-full px-3 py-2 bg-[#080C14] border border-[#141B29] focus:border-[#00F0FF]/60 rounded-xl text-xs text-white focus:outline-none transition font-tech"
                        >
                          <option value="Retail & E-commerce">Retail & E-commerce</option>
                          <option value="Fintech & Finanzas">Fintech & Finanzas</option>
                          <option value="Salud & Clínicas">Salud & Clínicas</option>
                          <option value="Bienes Raíces">Bienes Raíces</option>
                          <option value="Automotriz">Automotriz</option>
                          <option value="Educación & Capacitación">Educación & Capacitación</option>
                          <option value="Servicios Profesionales">Servicios Profesionales</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1 font-tech">
                          Ubicación / Ciudad Sede
                        </label>
                        <input
                          type="text"
                          value={formData.location}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                          placeholder="ej: Bogotá, Colombia"
                          className="w-full px-3 py-2 bg-[#080C14] border border-[#141B29] focus:border-[#00F0FF]/60 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition font-tech"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bloque 2: Administrador Principal */}
                  <div className="space-y-3 pt-2 border-t border-[#141B29]">
                    <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-tech flex items-center gap-2">
                      <i className="fa-solid fa-user-shield"></i>
                      <span>2. Administrador Principal de la Empresa</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1 font-tech">
                          Nombre Completo del Administrador *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ej: Carlos López"
                          value={formData.adminFullName}
                          onChange={(e) => setFormData({ ...formData, adminFullName: e.target.value })}
                          className="w-full px-3 py-2 bg-[#080C14] border border-[#141B29] focus:border-[#00F0FF]/60 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1 font-tech">
                          Correo Electrónico de Login *
                        </label>
                        <input
                          type="email"
                          required
                          placeholder="admin@empresa-a.com"
                          value={formData.adminEmail}
                          onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                          className="w-full px-3 py-2 bg-[#080C14] border border-[#141B29] focus:border-[#00F0FF]/60 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition"
                        />
                      </div>

                      <div className="sm:col-span-2 p-3 rounded-xl bg-[#080C14] border border-amber-500/30 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-amber-400 font-tech">
                          <i className="fa-solid fa-key"></i>
                          <span>Contraseña Temporal Asignada:</span>
                        </div>
                        <span className="font-mono font-bold text-amber-300 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/40">
                          123456789 (Cambio obligatorio)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bloque 3: Límites de Redes Sociales Permitidas */}
                  <div className="space-y-3 pt-2 border-t border-[#141B29]">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-[#00F0FF] uppercase tracking-wider font-tech flex items-center gap-2">
                        <i className="fa-solid fa-sliders"></i>
                        <span>3. Límites de Redes Sociales Permitidas</span>
                      </h4>
                      <span className="text-[10px] text-slate-400 font-tech">Máximo de cuentas permitidas</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 rounded-xl bg-[#080C14] border border-[#141B29]">
                        <div className="flex items-center gap-2 mb-1.5 text-xs text-slate-300 font-tech">
                          <i className="fa-brands fa-facebook-f text-[#1877F2]"></i>
                          <span>Facebook</span>
                        </div>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={formData.channelLimits.FACEBOOK}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              channelLimits: {
                                ...formData.channelLimits,
                                FACEBOOK: Math.max(0, parseInt(e.target.value, 10) || 0),
                              },
                            })
                          }
                          className="w-full px-2.5 py-1.5 bg-[#05080F] border border-[#141B29] focus:border-[#00F0FF]/60 rounded-lg text-xs text-white text-center font-bold focus:outline-none"
                        />
                      </div>

                      <div className="p-3 rounded-xl bg-[#080C14] border border-[#141B29]">
                        <div className="flex items-center gap-2 mb-1.5 text-xs text-slate-300 font-tech">
                          <i className="fa-brands fa-instagram text-rose-400"></i>
                          <span>Instagram</span>
                        </div>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={formData.channelLimits.INSTAGRAM}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              channelLimits: {
                                ...formData.channelLimits,
                                INSTAGRAM: Math.max(0, parseInt(e.target.value, 10) || 0),
                              },
                            })
                          }
                          className="w-full px-2.5 py-1.5 bg-[#05080F] border border-[#141B29] focus:border-[#00F0FF]/60 rounded-lg text-xs text-white text-center font-bold focus:outline-none"
                        />
                      </div>

                      <div className="p-3 rounded-xl bg-[#080C14] border border-[#141B29]">
                        <div className="flex items-center gap-2 mb-1.5 text-xs text-slate-300 font-tech">
                          <i className="fa-brands fa-whatsapp text-emerald-400"></i>
                          <span>WhatsApp</span>
                        </div>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={formData.channelLimits.WHATSAPP}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              channelLimits: {
                                ...formData.channelLimits,
                                WHATSAPP: Math.max(0, parseInt(e.target.value, 10) || 0),
                              },
                            })
                          }
                          className="w-full px-2.5 py-1.5 bg-[#05080F] border border-[#141B29] focus:border-[#00F0FF]/60 rounded-lg text-xs text-white text-center font-bold focus:outline-none"
                        />
                      </div>

                      <div className="p-3 rounded-xl bg-[#080C14] border border-[#141B29]">
                        <div className="flex items-center gap-2 mb-1.5 text-xs text-slate-300 font-tech">
                          <i className="fa-brands fa-tiktok text-cyan-400"></i>
                          <span>TikTok</span>
                        </div>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={formData.channelLimits.TIKTOK}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              channelLimits: {
                                ...formData.channelLimits,
                                TIKTOK: Math.max(0, parseInt(e.target.value, 10) || 0),
                              },
                            })
                          }
                          className="w-full px-2.5 py-1.5 bg-[#05080F] border border-[#141B29] focus:border-[#00F0FF]/60 rounded-lg text-xs text-white text-center font-bold focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Límite de Operadores Asignados */}
                    <div className="pt-2 flex items-center justify-between p-3 rounded-xl bg-[#080C14] border border-[#141B29]">
                      <div>
                        <span className="text-xs font-bold text-white font-tech block">
                          Límite Máximo de Operadores Permitidos
                        </span>
                        <span className="text-[10px] text-slate-400 font-tech">
                          Cantidad máxima de operadores que este administrador podrá crear
                        </span>
                      </div>
                      <div className="w-24">
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={formData.maxOperators}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              maxOperators: Math.max(1, parseInt(e.target.value, 10) || 1),
                            })
                          }
                          className="w-full px-2.5 py-1.5 bg-[#05080F] border border-[#141B29] focus:border-[#00F0FF]/60 rounded-lg text-xs text-white text-center font-bold focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Nota de Canales Vacíos */}
                  <div className="p-3 rounded-xl bg-[#080C14] border border-[#141B29] flex items-center gap-2.5 text-[11px] text-slate-400 font-tech">
                    <i className="fa-solid fa-circle-nodes text-[#00F0FF]"></i>
                    <span>
                      La empresa iniciará con <strong>0 canales por defecto</strong>. El administrador solo podrá vincular hasta las cuotas configuradas arriba.
                    </span>
                  </div>

                  {/* Botones de Envío */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsCreateModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-[#0E1524] hover:bg-[#141E33] border border-[#162032] text-xs font-semibold text-slate-300 hover:text-white transition font-tech"
                    >
                      Cancelar
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00F0FF] to-[#0072FF] hover:from-[#00D7E5] hover:to-[#005ecc] disabled:opacity-50 text-[#030508] font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-[#00F0FF]/20 font-tech"
                    >
                      {isSubmitting ? (
                        <>
                          <i className="fa-solid fa-spinner fa-spin text-xs"></i>
                          <span>Creando Espacio de Trabajo...</span>
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-check text-xs"></i>
                          <span>Crear Empresa y Administrador</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>,
          document.body
        )}

      {/* Modal Restablecer Contraseña (Portal) */}
      {adminToReset &&
        createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <div className="bg-[#05080F] border border-amber-500/40 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl shadow-amber-950/50 space-y-4">
              <div className="flex items-center gap-3 text-amber-400">
                <span className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-lg flex-shrink-0">
                  <i className="fa-solid fa-rotate-left"></i>
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white font-tech">Restablecer Contraseña</h3>
                  <p className="text-[11px] text-amber-400">{adminToReset.enterpriseName}</p>
                </div>
              </div>

              {resetSuccessMessage ? (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                    {resetSuccessMessage}
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setAdminToReset(null)}
                      className="px-4 py-2 rounded-xl bg-[#00F0FF] text-[#030508] font-bold text-xs transition font-tech"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-xs text-slate-300 leading-relaxed bg-[#080C14] p-3.5 rounded-2xl border border-[#141B29]">
                    ¿Deseas restablecer la contraseña del administrador <strong className="text-white">{adminToReset.name}</strong> (<span className="text-[#00F0FF]">{adminToReset.email}</span>) a la contraseña temporal por defecto <code className="text-amber-300 font-mono font-bold">123456789</code>?
                  </p>
                  <p className="text-[11px] text-slate-400 font-tech">
                    ⚠️ El usuario estará obligado a ingresar una nueva contraseña personal tan pronto inicie sesión.
                  </p>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      disabled={isResetting}
                      onClick={() => setAdminToReset(null)}
                      className="px-4 py-2 rounded-xl bg-[#0E1524] hover:bg-[#141E33] border border-[#162032] text-xs font-semibold text-slate-300 hover:text-white transition font-tech"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={isResetting}
                      onClick={handleResetPassword}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-amber-500/20 font-tech"
                    >
                      {isResetting ? (
                        <>
                          <i className="fa-solid fa-spinner fa-spin"></i>
                          <span>Restableciendo...</span>
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-check"></i>
                          <span>Confirmar Restablecimiento</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>,
          document.body
        )}

      {/* Modal Confirmar Eliminación (Portal) */}
      {enterpriseToDelete &&
        createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <div className="bg-[#070B14] border border-rose-500/40 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl shadow-rose-950/50 space-y-4">
              <div className="flex items-center gap-3 text-rose-400">
                <span className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-lg flex-shrink-0">
                  <i className="fa-solid fa-triangle-exclamation"></i>
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white font-tech">¿Eliminar Empresa Permanentemente?</h3>
                  <p className="text-[11px] text-slate-400">Esta acción destruirá su espacio de trabajo</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed bg-[#04060C] p-3.5 rounded-2xl border border-[#111726]">
                Estás a punto de eliminar a <strong className="text-white">{enterpriseToDelete.name}</strong>. Se destruirá su espacio de trabajo aislado (Tenant), sus operadores y sus configuraciones conforme a los protocolos de seguridad.
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setEnterpriseToDelete(null)}
                  className="px-4 py-2 rounded-xl bg-[#0E1524] hover:bg-[#141E33] border border-[#162032] text-xs font-semibold text-slate-300 hover:text-white transition font-tech"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => handleDeleteEnterprise(enterpriseToDelete)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-rose-600/30 font-tech disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin text-xs"></i>
                      <span>Eliminando...</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-trash text-xs"></i>
                      <span>Sí, Eliminar Definitivamente</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      {/* Modal de Gestión de Operadores por Empresa (Portal) */}
      {selectedEnterpriseForOperators &&
        createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <div className="bg-[#05080F] border border-[#00F0FF]/40 rounded-3xl p-6 sm:p-7 max-w-2xl w-full shadow-2xl shadow-cyan-950/50 space-y-4 max-h-[90vh] flex flex-col">
              {/* Encabezado */}
              <div className="flex items-center justify-between pb-3 border-b border-[#141B29]">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-2xl bg-[#00F0FF]/15 border border-[#00F0FF]/30 text-[#00F0FF] flex items-center justify-center text-base">
                    <i className="fa-solid fa-users-gear"></i>
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-white font-tech">
                      Gestión de Operadores — {selectedEnterpriseForOperators.name}
                    </h3>
                    <p className="text-[11px] text-[#00F0FF] font-medium font-tech">
                      Límite de la empresa: {selectedEnterpriseForOperators.maxOperators || 5} operadores máx.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedEnterpriseForOperators(null)}
                  className="w-7 h-7 rounded-lg bg-[#0E1524] text-slate-400 hover:text-white flex items-center justify-center text-xs"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>

              {/* Mensaje de Acción Exitosa */}
              {operatorActionMessage && (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-tech flex items-center gap-2">
                  <i className="fa-solid fa-circle-check text-emerald-400"></i>
                  <span>{operatorActionMessage}</span>
                </div>
              )}

              {/* Lista de Operadores */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                {isLoadingOperators ? (
                  <div className="py-12 text-center text-slate-400 font-tech">
                    <i className="fa-solid fa-spinner fa-spin text-2xl text-[#00F0FF] mb-2"></i>
                    <p className="text-xs">Cargando operarios de la empresa...</p>
                  </div>
                ) : enterpriseOperatorsList.length === 0 ? (
                  <div className="py-10 text-center rounded-2xl bg-[#080C14] border border-[#141B29] text-slate-500 font-tech">
                    <i className="fa-solid fa-user-slash text-3xl mb-2 text-slate-600"></i>
                    <p className="text-xs">No hay operadores registrados en esta empresa todavía.</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">El administrador de la empresa puede dar de alta hasta {selectedEnterpriseForOperators.maxOperators || 5} operarios.</p>
                  </div>
                ) : (
                  enterpriseOperatorsList.map((op) => (
                    <div
                      key={op.id}
                      className="p-3.5 rounded-2xl bg-[#080C14] border border-[#141B29] hover:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold font-tech flex-shrink-0 border ${
                          op.isBlocked
                            ? 'bg-rose-950/40 border-rose-500/40 text-rose-400'
                            : 'bg-[#111622] border-[#1C2A44] text-[#00F0FF]'
                        }`}>
                          {op.avatar || op.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-white text-xs truncate">{op.name}</p>
                            <span className={`px-2 py-0.2 rounded text-[9px] font-bold font-tech border ${
                              op.role === 'Administrador'
                                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                            }`}>
                              {op.role}
                            </span>
                            <span className={`px-2 py-0.2 rounded-full text-[9px] font-bold font-tech border flex items-center gap-1 ${
                              op.isBlocked
                                ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            }`}>
                              <span className={`w-1 h-1 rounded-full ${op.isBlocked ? 'bg-rose-400' : 'bg-emerald-400'}`}></span>
                              <span>{op.isBlocked ? 'Bloqueado' : 'Activo'}</span>
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono truncate">{op.email}</p>
                        </div>
                      </div>

                      {/* Acciones para este operador */}
                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        <button
                          type="button"
                          onClick={() => handleResetOperatorPassword(op)}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-tech font-bold flex items-center gap-1 transition"
                          title="Restablecer clave temporal a 123456789"
                        >
                          <i className="fa-solid fa-key text-[9px]"></i>
                          <span>Clave 123456789</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleOperatorBlock(op)}
                          className={`px-2.5 py-1.5 rounded-lg text-[10px] font-tech font-bold border transition flex items-center gap-1 ${
                            op.isBlocked
                              ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30'
                          }`}
                          title={op.isBlocked ? 'Desbloquear acceso a la plataforma' : 'Bloquear acceso a la plataforma'}
                        >
                          <i className={`fa-solid ${op.isBlocked ? 'fa-lock-open' : 'fa-ban'} text-[9px]`}></i>
                          <span>{op.isBlocked ? 'Desbloquear' : 'Bloquear'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteOperator(op)}
                          className="w-7 h-7 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center text-xs transition"
                          title="Eliminar este operador definitivamente"
                        >
                          <i className="fa-solid fa-trash text-[10px]"></i>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pie del modal */}
              <div className="pt-3 border-t border-[#141B29] flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-tech">
                  Total Operarios: {enterpriseOperatorsList.length} / {selectedEnterpriseForOperators.maxOperators || 5} permitidos
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedEnterpriseForOperators(null)}
                  className="px-4 py-2 rounded-xl bg-[#080C14] hover:bg-[#0E1524] border border-[#141B29] text-xs font-semibold text-slate-300 hover:text-white transition font-tech"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </section>
  );
};
