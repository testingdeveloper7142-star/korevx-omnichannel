import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { soundManager } from '../../utils/audio';

interface EnterpriseItem {
  id: string;
  name: string;
  nit?: string;
  industry: string;
  plan: 'Enterprise' | 'Business Pro' | 'Starter';
  activeChannels: string[];
  operatorCount: number;
  monthlyApiRequests: number;
  quotaLimit: number;
  storageMb: number;
  slaPercent: number;
  lastActive: string;
  location: string;
  techLead: string;
  adminEmail?: string;
  channelBreakdown: { channel: string; percent: number }[];
  status: 'ACTIVE' | 'TRIAL' | 'MAINTENANCE';
}

const mockEnterprises: EnterpriseItem[] = [
  {
    id: 'b2d78f5f-95e6-4191-8ec6-a958e8c10bbc',
    name: 'KorevX Global (Sede Central)',
    industry: 'Software & Telecomunicaciones',
    plan: 'Enterprise',
    activeChannels: ['Instagram', 'Facebook', 'TikTok', 'WhatsApp'],
    operatorCount: 8,
    monthlyApiRequests: 64280,
    quotaLimit: 100000,
    storageMb: 4820,
    slaPercent: 100,
    lastActive: 'Hace 2 min',
    location: 'Bogotá, Colombia',
    techLead: 'Ing. Alejandro Vega',
    channelBreakdown: [
      { channel: 'Instagram', percent: 42 },
      { channel: 'WhatsApp', percent: 30 },
      { channel: 'TikTok', percent: 18 },
      { channel: 'Facebook', percent: 10 },
    ],
    status: 'ACTIVE',
  },
  {
    id: 'ent-002',
    name: 'Moda & Calzado Trendy SAS',
    industry: 'Retail & E-commerce',
    plan: 'Business Pro',
    activeChannels: ['Instagram', 'WhatsApp', 'TikTok'],
    operatorCount: 5,
    monthlyApiRequests: 38150,
    quotaLimit: 50000,
    storageMb: 2640,
    slaPercent: 99.9,
    lastActive: 'Hace 6 min',
    location: 'Medellín, Colombia',
    techLead: 'Valeria Restrepo',
    channelBreakdown: [
      { channel: 'Instagram', percent: 55 },
      { channel: 'WhatsApp', percent: 30 },
      { channel: 'TikTok', percent: 15 },
    ],
    status: 'ACTIVE',
  },
  {
    id: 'ent-003',
    name: 'TechStore Colombia',
    industry: 'Electrónica & Consumo',
    plan: 'Business Pro',
    activeChannels: ['Instagram', 'Facebook', 'TikTok'],
    operatorCount: 6,
    monthlyApiRequests: 42910,
    quotaLimit: 50000,
    storageMb: 3120,
    slaPercent: 99.8,
    lastActive: 'Hace 11 min',
    location: 'Cali, Colombia',
    techLead: 'Mateo Cárdenas',
    channelBreakdown: [
      { channel: 'TikTok', percent: 45 },
      { channel: 'Instagram', percent: 35 },
      { channel: 'Facebook', percent: 20 },
    ],
    status: 'ACTIVE',
  },
  {
    id: 'ent-004',
    name: 'Salud & Vida Integral IPS',
    industry: 'Salud & Clínicas',
    plan: 'Enterprise',
    activeChannels: ['WhatsApp', 'Facebook'],
    operatorCount: 12,
    monthlyApiRequests: 28400,
    quotaLimit: 100000,
    storageMb: 5200,
    slaPercent: 100,
    lastActive: 'Hace 4 min',
    location: 'Barranquilla, Colombia',
    techLead: 'Dra. Claudia Mendoza',
    channelBreakdown: [
      { channel: 'WhatsApp', percent: 80 },
      { channel: 'Facebook', percent: 20 },
    ],
    status: 'ACTIVE',
  },
  {
    id: 'ent-005',
    name: 'Inmobiliaria Horizonte Urbano',
    industry: 'Bienes Raíces',
    plan: 'Starter',
    activeChannels: ['WhatsApp', 'Facebook'],
    operatorCount: 3,
    monthlyApiRequests: 11200,
    quotaLimit: 20000,
    storageMb: 980,
    slaPercent: 99.7,
    lastActive: 'Hace 25 min',
    location: 'Bucaramanga, Colombia',
    techLead: 'Felipe Salazar',
    channelBreakdown: [
      { channel: 'WhatsApp', percent: 65 },
      { channel: 'Facebook', percent: 35 },
    ],
    status: 'ACTIVE',
  },
  {
    id: 'ent-006',
    name: 'FinTech PagosYa Colombia',
    industry: 'Fintech & Finanzas',
    plan: 'Enterprise',
    activeChannels: ['WhatsApp', 'Instagram', 'Telegram'],
    operatorCount: 9,
    monthlyApiRequests: 51600,
    quotaLimit: 100000,
    storageMb: 3950,
    slaPercent: 100,
    lastActive: 'Hace 1 min',
    location: 'Bogotá, Colombia',
    techLead: 'Camilo Quintero',
    channelBreakdown: [
      { channel: 'WhatsApp', percent: 50 },
      { channel: 'Instagram', percent: 35 },
      { channel: 'Telegram', percent: 15 },
    ],
    status: 'ACTIVE',
  },
  {
    id: 'ent-007',
    name: 'AutoMotors Premier',
    industry: 'Automotriz',
    plan: 'Business Pro',
    activeChannels: ['Instagram', 'Facebook', 'WhatsApp'],
    operatorCount: 4,
    monthlyApiRequests: 19800,
    quotaLimit: 50000,
    storageMb: 1840,
    slaPercent: 99.8,
    lastActive: 'Hace 30 min',
    location: 'Pereira, Colombia',
    techLead: 'Juliana Pineda',
    channelBreakdown: [
      { channel: 'Instagram', percent: 50 },
      { channel: 'WhatsApp', percent: 35 },
      { channel: 'Facebook', percent: 15 },
    ],
    status: 'ACTIVE',
  },
  {
    id: 'ent-008',
    name: 'EduGlobal Academia Virtual',
    industry: 'Educación & Capacitación',
    plan: 'Starter',
    activeChannels: ['WhatsApp', 'TikTok'],
    operatorCount: 3,
    monthlyApiRequests: 14500,
    quotaLimit: 20000,
    storageMb: 1100,
    slaPercent: 99.9,
    lastActive: 'Hace 18 min',
    location: 'Cartagena, Colombia',
    techLead: 'Oscar Tamayo',
    channelBreakdown: [
      { channel: 'TikTok', percent: 60 },
      { channel: 'WhatsApp', percent: 40 },
    ],
    status: 'ACTIVE',
  },
];

interface ChannelStatGlobal {
  name: string;
  icon: string;
  color: string;
  enterprisesCount: number;
  monthlyEvents: string;
  sharePercent: number;
  avgLatencyMs: number;
  providerUptime: number;
  webhookStatus: string;
}

const mockGlobalChannelStats: ChannelStatGlobal[] = [
  {
    name: 'Instagram Direct',
    icon: 'fa-brands fa-instagram text-rose-400',
    color: 'from-amber-500 via-rose-500 to-purple-500',
    enterprisesCount: 13,
    monthlyEvents: '78,420',
    sharePercent: 42.5,
    avgLatencyMs: 132,
    providerUptime: 99.99,
    webhookStatus: 'Verificado (Meta Graph v19)',
  },
  {
    name: 'WhatsApp Business API',
    icon: 'fa-brands fa-whatsapp text-emerald-400',
    color: 'from-emerald-500 to-teal-500',
    enterprisesCount: 14,
    monthlyEvents: '54,180',
    sharePercent: 29.4,
    avgLatencyMs: 95,
    providerUptime: 100.0,
    webhookStatus: 'Verificado (Cloud API)',
  },
  {
    name: 'TikTok Video Comments',
    icon: 'fa-brands fa-tiktok text-cyan-400',
    color: 'from-cyan-500 to-blue-500',
    enterprisesCount: 10,
    monthlyEvents: '31,800',
    sharePercent: 17.2,
    avgLatencyMs: 168,
    providerUptime: 99.95,
    webhookStatus: 'Verificado (Open API v2)',
  },
  {
    name: 'Facebook Messenger',
    icon: 'fa-brands fa-facebook-f text-blue-400',
    color: 'from-blue-600 to-indigo-600',
    enterprisesCount: 8,
    monthlyEvents: '15,620',
    sharePercent: 8.5,
    avgLatencyMs: 145,
    providerUptime: 99.98,
    webhookStatus: 'Verificado (Graph API v19)',
  },
  {
    name: 'Telegram & Otros',
    icon: 'fa-brands fa-telegram text-sky-400',
    color: 'from-sky-500 to-blue-500',
    enterprisesCount: 3,
    monthlyEvents: '4,500',
    sharePercent: 2.4,
    avgLatencyMs: 82,
    providerUptime: 100.0,
    webhookStatus: 'Verificado (Bot API)',
  },
];

interface IndustryStatGlobal {
  sector: string;
  enterprisesCount: number;
  totalMonthlyRequests: string;
  sharePercent: number;
  totalOperators: number;
  requiredSla: string;
}

const mockGlobalIndustryStats: IndustryStatGlobal[] = [
  {
    sector: 'Retail & E-commerce',
    enterprisesCount: 5,
    totalMonthlyRequests: '81,060',
    sharePercent: 43.9,
    totalOperators: 21,
    requiredSla: '99.9% (Estándar)',
  },
  {
    sector: 'Software & Telecomunicaciones',
    enterprisesCount: 3,
    totalMonthlyRequests: '75,480',
    sharePercent: 40.9,
    totalOperators: 19,
    requiredSla: '99.99% (Crítico)',
  },
  {
    sector: 'Salud & Clínicas',
    enterprisesCount: 2,
    totalMonthlyRequests: '34,200',
    sharePercent: 18.5,
    totalOperators: 16,
    requiredSla: '100% (Misión Crítica / ARCO)',
  },
  {
    sector: 'Fintech & Finanzas',
    enterprisesCount: 2,
    totalMonthlyRequests: '51,600',
    sharePercent: 27.9,
    totalOperators: 11,
    requiredSla: '100% (Alta Disponibilidad)',
  },
  {
    sector: 'Bienes Raíces & Otros',
    enterprisesCount: 2,
    totalMonthlyRequests: '25,700',
    sharePercent: 13.9,
    totalOperators: 7,
    requiredSla: '99.5% (Estándar)',
  },
];

interface EnterpriseMetricsDashboardProps {
  onNavigateToSuperAdminSection?: (section: 'governance' | 'supportConsole' | 'infrastructure', filterEnterpriseName?: string) => void;
}

export const EnterpriseMetricsDashboard: React.FC<EnterpriseMetricsDashboardProps> = ({
  onNavigateToSuperAdminSection,
}) => {
  const [activeTab, setActiveTab] = useState<'global' | 'tenants'>('global');
  const [timeRange, setTimeRange] = useState<'today' | '7days' | '30days'>('30days');
  const [searchTerm, setSearchTerm] = useState('');
  const [planFilter, setPlanFilter] = useState<'ALL' | 'Enterprise' | 'Business Pro' | 'Starter'>('ALL');
  const [sortBy, setSortBy] = useState<'volume' | 'sla' | 'operators' | 'storage'>('volume');
  const [selectedEnterprise, setSelectedEnterprise] = useState<EnterpriseItem | null>(null);

  // Helper para resolver dinámicamente los canales reales vinculados a cada empresa
  const getEnterpriseActiveChannels = (entId: string, fallbackChannels: string[] = []): string[] => {
    try {
      const savedScoped = localStorage.getItem(`korevx_channels_${entId}`);
      if (savedScoped) {
        const parsed = JSON.parse(savedScoped);
        if (Array.isArray(parsed)) {
          if (parsed.length === 0) return [];
          return parsed.map((ch: any) => {
            if (ch.platform) {
              const p = String(ch.platform).toUpperCase();
              if (p === 'INSTAGRAM') return 'Instagram';
              if (p === 'WHATSAPP') return 'WhatsApp';
              if (p === 'FACEBOOK') return 'Facebook';
              if (p === 'TIKTOK') return 'TikTok';
              return ch.accountName || ch.platform;
            }
            return ch.accountName || 'Canal';
          });
        }
      }
      if (entId === 'b2d78f5f-95e6-4191-8ec6-a958e8c10bbc') {
        const savedLegacy = localStorage.getItem('korevx_channels');
        if (savedLegacy) {
          const parsedLegacy = JSON.parse(savedLegacy);
          if (Array.isArray(parsedLegacy) && parsedLegacy.length > 0) {
            return parsedLegacy.map((ch: any) => {
              const p = String(ch.platform || '').toUpperCase();
              if (p === 'INSTAGRAM') return 'Instagram';
              if (p === 'WHATSAPP') return 'WhatsApp';
              if (p === 'FACEBOOK') return 'Facebook';
              if (p === 'TIKTOK') return 'TikTok';
              return ch.accountName || 'Canal';
            });
          }
        }
      }
    } catch (e) {}
    return fallbackChannels || [];
  };

  // Helper para resolver dinámicamente la cantidad de operadores de cada empresa
  const getEnterpriseOperatorCount = (entId: string, fallbackCount: number): number => {
    try {
      const savedAgents = localStorage.getItem(`korevx_agents_${entId}`);
      if (savedAgents) {
        const parsed = JSON.parse(savedAgents);
        if (Array.isArray(parsed)) return parsed.length;
      }
      if (entId === 'b2d78f5f-95e6-4191-8ec6-a958e8c10bbc') {
        const savedLegacy = localStorage.getItem('korevx_agents');
        if (savedLegacy) {
          const parsed = JSON.parse(savedLegacy);
          if (Array.isArray(parsed)) return parsed.length;
        }
      }
    } catch (e) {}
    return fallbackCount;
  };

  // Helper para obtener agentes detallados para la ficha técnica
  const getEnterpriseAgents = (entId: string): any[] => {
    try {
      const savedAgents = localStorage.getItem(`korevx_agents_${entId}`);
      if (savedAgents) {
        const parsed = JSON.parse(savedAgents);
        if (Array.isArray(parsed)) return parsed;
      }
      if (entId === 'b2d78f5f-95e6-4191-8ec6-a958e8c10bbc') {
        const savedLegacy = localStorage.getItem('korevx_agents');
        if (savedLegacy) {
          const parsed = JSON.parse(savedLegacy);
          if (Array.isArray(parsed)) return parsed;
        }
      }
    } catch (e) {}
    return [];
  };

  // Lista viva de empresas (mezcla mock + backend + localStorage)
  const [enterprises, setEnterprises] = useState<EnterpriseItem[]>(() => {
    const saved = localStorage.getItem('korevx_custom_enterprises');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return [...parsed, ...mockEnterprises];
      } catch (e) {
        return mockEnterprises;
      }
    }
    return mockEnterprises;
  });

  // Cargar empresas creadas en backend
  useEffect(() => {
    axios
      .get('/api/v1/enterprises')
      .then((res) => {
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          setEnterprises((prev) => {
            const existingIds = new Set(prev.map((e) => e.id));
            const newOnes = res.data.filter((e: any) => !existingIds.has(e.id));
            return [...newOnes, ...prev];
          });
        }
      })
      .catch(() => {});
  }, []);

  // Modal de Creación de Empresa y Administrador
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createSuccessData, setCreateSuccessData] = useState<any | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Modal y estado para eliminar empresa
  const [enterpriseToDelete, setEnterpriseToDelete] = useState<EnterpriseItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    industry: 'Retail & E-commerce',
    plan: 'Business Pro' as 'Enterprise' | 'Business Pro' | 'Starter',
    quotaLimit: 50000,
    maxOperators: 5,
    location: 'Bogotá, Colombia',
    adminFullName: '',
    adminEmail: '',
    adminPassword: '',
  });

  const handleCreateEnterprise = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);
    try {
      const res = await axios.post('/api/v1/enterprises', formData);
      if (res.data && res.data.success) {
        const newEnt: EnterpriseItem = res.data.enterprise;
        setEnterprises((prev) => [newEnt, ...prev]);

        // Guardar en localStorage de empresas creadas
        const saved = localStorage.getItem('korevx_custom_enterprises');
        const customList = saved ? JSON.parse(saved) : [];
        customList.unshift(newEnt);
        localStorage.setItem('korevx_custom_enterprises', JSON.stringify(customList));

        // Registrar admin creado para login rápido
        const savedAdmins = localStorage.getItem('korevx_registered_admins');
        const adminList = savedAdmins ? JSON.parse(savedAdmins) : [];
        adminList.unshift(res.data.administrator);
        localStorage.setItem('korevx_registered_admins', JSON.stringify(adminList));

        // Notificación en header
        const savedNotifs = localStorage.getItem('korevx_notifications');
        const notifs = savedNotifs ? JSON.parse(savedNotifs) : [];
        notifs.unshift({
          id: 'notif-' + Date.now(),
          title: '🏢 Nueva Empresa Registrada',
          message: `Se dio de alta a ${newEnt.name} y su administrador ${res.data.administrator.fullName}.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'SECURITY',
          read: false,
        });
        localStorage.setItem('korevx_notifications', JSON.stringify(notifs));

        soundManager.playNotification();
        setCreateSuccessData(res.data);
      }
    } catch (err: any) {
      setFormError(
        err.response?.data?.message || 'Error al registrar la empresa. Verifica los datos ingresados.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEnterprise = async (ent: EnterpriseItem) => {
    if (ent.id === 'b2d78f5f-95e6-4191-8ec6-a958e8c10bbc') {
      soundManager.playWarning();
      alert('No es posible eliminar la sede central (KorevX Global), ya que es el núcleo operativo del sistema.');
      setEnterpriseToDelete(null);
      return;
    }

    setIsDeleting(true);
    try {
      try {
        await axios.delete(`/api/v1/enterprises/${ent.id}`);
      } catch (err) {
        console.warn('Backend delete notification:', err);
      }

      // Remover del estado
      setEnterprises((prev) => prev.filter((e) => e.id !== ent.id));

      // Remover del localStorage de empresas personalizadas
      const saved = localStorage.getItem('korevx_custom_enterprises');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const updated = parsed.filter((e: any) => e.id !== ent.id);
          localStorage.setItem('korevx_custom_enterprises', JSON.stringify(updated));
        } catch (e) {}
      }

      // Limpiar almacenamiento aislado de este workspace
      localStorage.removeItem(`korevx_conversations_${ent.id}`);
      localStorage.removeItem(`korevx_channels_${ent.id}`);
      localStorage.removeItem(`korevx_agents_${ent.id}`);

      // Notificación en header
      const savedNotifs = localStorage.getItem('korevx_notifications');
      const notifs = savedNotifs ? JSON.parse(savedNotifs) : [];
      notifs.unshift({
        id: 'notif-' + Date.now(),
        title: '🗑️ Empresa Eliminada',
        message: `La empresa "${ent.name}" fue eliminada definitivamente del sistema con todo su entorno aislado.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'SECURITY',
        read: false,
      });
      localStorage.setItem('korevx_notifications', JSON.stringify(notifs));

      soundManager.playWarning();
      if (selectedEnterprise?.id === ent.id) {
        setSelectedEnterprise(null);
      }
      setEnterpriseToDelete(null);
    } catch (err: any) {
      alert('Error eliminando la empresa: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtrado y ordenamiento de empresas
  const filteredEnterprises = enterprises
    .filter((ent) => {
      if (planFilter !== 'ALL' && ent.plan !== planFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          ent.name.toLowerCase().includes(q) ||
          ent.industry.toLowerCase().includes(q) ||
          ent.location.toLowerCase().includes(q) ||
          ent.id.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'volume') return b.monthlyApiRequests - a.monthlyApiRequests;
      if (sortBy === 'sla') return b.slaPercent - a.slaPercent;
      if (sortBy === 'operators') return b.operatorCount - a.operatorCount;
      if (sortBy === 'storage') return b.storageMb - a.storageMb;
      return 0;
    });

  const totalMonthlyRequests = enterprises
    .reduce((acc, curr) => acc + curr.monthlyApiRequests, 0)
    .toLocaleString();

  const totalStorageGb = (
    enterprises.reduce((acc, curr) => acc + curr.storageMb, 0) / 1024
  ).toFixed(1);

  const totalOperators = enterprises.reduce((acc, curr) => acc + curr.operatorCount, 0);

  return (
    <section className="w-full h-full overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#030508] fade-in space-y-6">
      {/* Cabecera Principal y Switcher de Estadísticas */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#111622]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30 flex items-center justify-center text-sm shadow-sm shadow-[#00F0FF]/20">
              <i className="fa-solid fa-chart-pie"></i>
            </span>
            <h2 className="text-xl font-bold text-white font-tech">
              Métricas y Estadísticas Corporativas
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Telemetría agregada global y tablas estadísticas por empresa (tenants).
          </p>
        </div>

        {/* Acciones Super Admin: Botón Crear Empresa y Selectores */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Botón Destacado: Crear Nueva Empresa y Administrador */}
          <button
            onClick={() => {
              setCreateSuccessData(null);
              setFormError(null);
              setFormData({
                name: '',
                industry: 'Retail & E-commerce',
                plan: 'Business Pro',
                quotaLimit: 50000,
                maxOperators: 5,
                location: 'Bogotá, Colombia',
                adminFullName: '',
                adminEmail: '',
                adminPassword: '',
              });
              setIsCreateModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#00F0FF] to-[#0072FF] hover:from-[#00D7E5] hover:to-[#005ecc] text-[#030508] font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-[#00F0FF]/25 font-tech tracking-wide"
          >
            <i className="fa-solid fa-plus text-xs"></i>
            <span>Nueva Empresa y Admin</span>
          </button>

          {/* Selector de Pestañas: Global vs Por Empresa */}
          <div className="flex items-center bg-[#080C14] p-1 rounded-xl border border-[#141B29] text-xs font-tech">
            <button
              onClick={() => setActiveTab('global')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-2 ${
                activeTab === 'global'
                  ? 'bg-[#0E1524] text-white border border-[#00F0FF]/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <i className="fa-solid fa-globe text-[#00F0FF]"></i>
              <span>Globales</span>
            </button>
            <button
              onClick={() => setActiveTab('tenants')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-2 ${
                activeTab === 'tenants'
                  ? 'bg-[#0E1524] text-white border border-[#00F0FF]/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <i className="fa-solid fa-building text-[#00F0FF]"></i>
              <span>Por Empresa</span>
              <span className="px-1.5 py-0.2 rounded-full bg-[#00F0FF]/20 text-[#00F0FF] text-[10px] font-bold">
                {enterprises.length}
              </span>
            </button>
          </div>

          {/* Selector de Periodo */}
          <div className="flex items-center bg-[#080C14] p-1 rounded-xl border border-[#141B29] text-xs font-tech">
            <button
              onClick={() => setTimeRange('today')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition ${
                timeRange === 'today' ? 'bg-[#0E1524] text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Hoy
            </button>
            <button
              onClick={() => setTimeRange('7days')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition ${
                timeRange === '7days' ? 'bg-[#0E1524] text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              7D
            </button>
            <button
              onClick={() => setTimeRange('30days')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition ${
                timeRange === '30days' ? 'bg-[#0E1524] text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              30D
            </button>
          </div>
        </div>
      </div>

      {/* Banner de Cumplimiento Normativo (Ley 1581 / Secreto Comercial) */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/20 via-blue-950/20 to-purple-950/20 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0">
            <i className="fa-solid fa-shield-halved text-sm"></i>
          </div>
          <div>
            <span className="text-xs font-bold text-white flex items-center gap-2">
              Telemetría y Analítica Agregada (Conforme a Ley 1581 de 2012)
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 font-tech">
                Aislamiento Total RLS
              </span>
            </span>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              Las métricas reflejan volúmenes de consumo, peticiones de red y SLA de infraestructura.
              <strong> Ningún chat privado, dato personal de clientes ni mensaje individual es expuesto.</strong>
            </p>
          </div>
        </div>
      </div>

      {/* 4 Macro Tarjetas KPI Globales de la Plataforma */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#05080F] border border-[#111726] hover:border-[#00F0FF]/30 transition group">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-tech uppercase tracking-wider">Empresas (Tenants)</span>
            <span className="w-8 h-8 rounded-lg bg-[#00F0FF]/10 text-[#00F0FF] flex items-center justify-center text-xs group-hover:scale-110 transition">
              <i className="fa-solid fa-building"></i>
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-2xl font-bold text-white font-tech">{mockEnterprises.length}</span>
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1 font-tech">
              <i className="fa-solid fa-arrow-trend-up"></i> +16.6%
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">{totalOperators} operadores distribuidos</p>
        </div>

        <div className="p-5 rounded-2xl bg-[#05080F] border border-[#111726] hover:border-[#00F0FF]/30 transition group">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-tech uppercase tracking-wider">Tráfico de APIs / Mes</span>
            <span className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center text-xs group-hover:scale-110 transition">
              <i className="fa-solid fa-network-wired"></i>
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-2xl font-bold text-white font-tech">{totalMonthlyRequests}</span>
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1 font-tech">
              <i className="fa-solid fa-arrow-trend-up"></i> +14.8%
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Webhooks Meta & TikTok procesados</p>
        </div>

        <div className="p-5 rounded-2xl bg-[#05080F] border border-[#111726] hover:border-emerald-500/30 transition group">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-tech uppercase tracking-wider">Disponibilidad Global</span>
            <span className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xs group-hover:scale-110 transition">
              <i className="fa-solid fa-circle-check"></i>
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-2xl font-bold text-emerald-400 font-tech">99.98%</span>
            <span className="text-xs text-slate-400 font-tech">SLA Plataforma</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Sin caídas de servicio registradas</p>
        </div>

        <div className="p-5 rounded-2xl bg-[#05080F] border border-[#111726] hover:border-purple-500/30 transition group">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-tech uppercase tracking-wider">Almacenamiento Global</span>
            <span className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center text-xs group-hover:scale-110 transition">
              <i className="fa-solid fa-database"></i>
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-2xl font-bold text-white font-tech">{totalStorageGb} GB</span>
            <span className="text-xs text-slate-400 font-tech">/ 100 GB</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Supabase Pooler IPv4 conectado</p>
        </div>
      </div>

      {activeTab === 'global' ? (
        /* ================= VISTA 1: ESTADÍSTICAS GLOBALES ================= */
        <div className="space-y-6 fade-in">
          {/* Tabla Estadística Global de Consumo por Red Social & APIs */}
          <div className="p-5 rounded-2xl bg-[#05080F] border border-[#111726] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-share-nodes text-[#00F0FF] text-xs"></i>
                <h3 className="text-sm font-bold text-white font-tech">
                  Tabla Estadística Global: Distribución de Tráfico por Red Social & APIs
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-tech">Telemetría de Webhooks y APIs conectoras</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[#111622] text-slate-400 font-tech uppercase text-[10px]">
                    <th className="pb-3">Plataforma / Canal</th>
                    <th className="pb-3">Empresas Conectadas</th>
                    <th className="pb-3">Eventos Mensuales</th>
                    <th className="pb-3">% Cuota de Tráfico Global</th>
                    <th className="pb-3">Latencia Promedio</th>
                    <th className="pb-3">Uptime Proveedor</th>
                    <th className="pb-3 text-right">Estado Conector</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#111622]">
                  {mockGlobalChannelStats.map((ch) => (
                    <tr key={ch.name} className="hover:bg-[#080C14] transition">
                      <td className="py-3.5 font-bold text-white flex items-center gap-2">
                        <i className={`${ch.icon} text-sm`}></i>
                        <span>{ch.name}</span>
                      </td>
                      <td className="py-3.5 font-tech text-slate-300">
                        <span className="font-semibold text-white">{ch.enterprisesCount}</span> de {mockEnterprises.length} empresas
                      </td>
                      <td className="py-3.5 font-tech font-bold text-white">
                        {ch.monthlyEvents}
                      </td>
                      <td className="py-3.5 font-tech">
                        <div className="flex items-center gap-2 w-36">
                          <div className="flex-1 h-2 rounded-full bg-[#080C14] border border-[#141B29] overflow-hidden">
                            <div
                              className={`h-full bg-gradient-to-r ${ch.color} rounded-full`}
                              style={{ width: `${ch.sharePercent}%` }}
                            ></div>
                          </div>
                          <span className="text-[11px] font-semibold text-slate-300">{ch.sharePercent}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 font-tech text-slate-400">
                        <strong>{ch.avgLatencyMs}</strong> ms
                      </td>
                      <td className="py-3.5 font-tech text-emerald-400 font-bold">
                        {ch.providerUptime}%
                      </td>
                      <td className="py-3.5 text-right">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 font-tech">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          Operativo
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tabla Estadística Global por Sector Industrial */}
          <div className="p-5 rounded-2xl bg-[#05080F] border border-[#111726] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-chart-column text-[#00F0FF] text-xs"></i>
                <h3 className="text-sm font-bold text-white font-tech">
                  Tabla Estadística Global: Consumo y Demanda por Sector Industrial
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-tech">Consolidado inter-empresa</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[#111622] text-slate-400 font-tech uppercase text-[10px]">
                    <th className="pb-3">Sector / Industria</th>
                    <th className="pb-3">N° Empresas</th>
                    <th className="pb-3">Peticiones Mensuales</th>
                    <th className="pb-3">% Tráfico Plataforma</th>
                    <th className="pb-3">Total Operadores</th>
                    <th className="pb-3 text-right">Criticidad & SLA Exigido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#111622]">
                  {mockGlobalIndustryStats.map((ind) => (
                    <tr key={ind.sector} className="hover:bg-[#080C14] transition">
                      <td className="py-3.5 font-bold text-white font-tech">
                        {ind.sector}
                      </td>
                      <td className="py-3.5 font-tech text-cyan-400 font-bold">
                        {ind.enterprisesCount} empresas
                      </td>
                      <td className="py-3.5 font-tech text-white font-semibold">
                        {ind.totalMonthlyRequests}
                      </td>
                      <td className="py-3.5 font-tech">
                        <div className="flex items-center gap-2 w-32">
                          <div className="flex-1 h-1.5 rounded-full bg-[#080C14] border border-[#141B29] overflow-hidden">
                            <div
                              className="h-full bg-[#00F0FF] rounded-full"
                              style={{ width: `${ind.sharePercent}%` }}
                            ></div>
                          </div>
                          <span className="text-[11px] text-slate-300">{ind.sharePercent}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 font-tech text-slate-300">
                        {ind.totalOperators} operadores
                      </td>
                      <td className="py-3.5 text-right font-tech text-slate-300">
                        <span className="px-2 py-0.5 rounded bg-[#0A0E17] border border-[#141B29] text-[10px]">
                          {ind.requiredSla}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* ================= VISTA 2: ESTADÍSTICAS POR EMPRESA (TENANTS) ================= */
        <div className="space-y-6 fade-in">
          {/* Controles de Filtrado y Búsqueda por Empresa */}
          <div className="p-5 rounded-2xl bg-[#05080F] border border-[#111726] space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-building text-[#00F0FF] text-xs"></i>
                  <h3 className="text-sm font-bold text-white font-tech">
                    Directorio Estadístico y Analítica por Empresa (Tenants)
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-[#00F0FF]/15 text-[#00F0FF] text-[10px] font-bold font-tech border border-[#00F0FF]/30">
                    {filteredEnterprises.length} de {mockEnterprises.length} Empresas
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Haz clic en cualquier empresa o en <strong>Ficha Técnica</strong> para consultar el desglose individual.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Buscador */}
                <div className="relative">
                  <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-500 text-xs"></i>
                  <input
                    type="text"
                    placeholder="Buscar empresa, sector, ciudad..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-[#080C14] border border-[#141B29] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00F0FF]/50 w-52 sm:w-64"
                  />
                </div>

                {/* Filtro por Plan */}
                <select
                  value={planFilter}
                  onChange={(e: any) => setPlanFilter(e.target.value)}
                  className="bg-[#080C14] border border-[#141B29] rounded-xl px-2.5 py-1.5 text-xs text-slate-300 font-tech"
                >
                  <option value="ALL">Todos los Planes</option>
                  <option value="Enterprise">Enterprise</option>
                  <option value="Business Pro">Business Pro</option>
                  <option value="Starter">Starter</option>
                </select>

                {/* Selector de Orden */}
                <select
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="bg-[#080C14] border border-[#141B29] rounded-xl px-2.5 py-1.5 text-xs text-slate-300 font-tech"
                >
                  <option value="volume">Ordenar: Mayor Volumen</option>
                  <option value="sla">Ordenar: Mayor SLA</option>
                  <option value="operators">Ordenar: Más Operadores</option>
                  <option value="storage">Ordenar: Mayor Almacenamiento</option>
                </select>
              </div>
            </div>

            {/* Gran Tabla de Empresas con Estadísticas Individuales */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[#111622] text-slate-400 font-tech uppercase text-[10px]">
                    <th className="pb-3">Empresa (Tenant)</th>
                    <th className="pb-3">Sector</th>
                    <th className="pb-3">Plan</th>
                    <th className="pb-3">Canales</th>
                    <th className="pb-3">Operadores</th>
                    <th className="pb-3">Tráfico / Cuota Asignada</th>
                    <th className="pb-3">Almacenamiento</th>
                    <th className="pb-3">SLA</th>
                    <th className="pb-3">Ley 1581</th>
                    <th className="pb-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#111622]">
                  {filteredEnterprises.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-500">
                        No se encontraron empresas con los criterios de búsqueda seleccionados.
                      </td>
                    </tr>
                  ) : (
                    filteredEnterprises.map((ent) => {
                      const usagePercent = Math.round((ent.monthlyApiRequests / ent.quotaLimit) * 100);
                      return (
                        <tr
                          key={ent.id}
                          onClick={() => setSelectedEnterprise(ent)}
                          className="hover:bg-[#080C14] transition cursor-pointer group"
                        >
                          <td className="py-3.5">
                            <div className="font-bold text-white group-hover:text-[#00F0FF] transition">
                              {ent.name}
                            </div>
                            <div className="text-[10px] text-slate-500 font-tech flex items-center gap-2 mt-0.5">
                              <span>{ent.location}</span>
                              <span>•</span>
                              <span className="font-mono">ID: {ent.id.substring(0, 8)}...</span>
                            </div>
                          </td>
                          <td className="py-3.5 text-slate-300 font-tech">{ent.industry}</td>
                          <td className="py-3.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-tech ${
                                ent.plan === 'Enterprise'
                                  ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                                  : ent.plan === 'Business Pro'
                                  ? 'bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30'
                                  : 'bg-slate-800 text-slate-300 border border-slate-700'
                              }`}
                            >
                              {ent.plan}
                            </span>
                          </td>
                          <td className="py-3.5">
                            {(() => {
                              const dynamicChannels = getEnterpriseActiveChannels(ent.id, ent.activeChannels);
                              if (dynamicChannels.length === 0) {
                                return (
                                  <span className="text-[10px] text-slate-500 italic font-tech">
                                    Sin canales vinculados
                                  </span>
                                );
                              }
                              return (
                                <div className="flex flex-wrap items-center gap-1">
                                  {dynamicChannels.map((ch) => {
                                    const chLower = ch.toLowerCase();
                                    const isInsta = chLower.includes('instagram');
                                    const isWa = chLower.includes('whatsapp');
                                    const isFb = chLower.includes('facebook');
                                    const isTk = chLower.includes('tiktok');
                                    return (
                                      <span
                                        key={ch}
                                        className={`px-2 py-0.5 rounded text-[10px] font-tech font-medium flex items-center gap-1 border ${
                                          isInsta
                                            ? 'bg-rose-950/40 text-rose-300 border-rose-500/30'
                                            : isWa
                                            ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                                            : isFb
                                            ? 'bg-blue-950/40 text-blue-300 border-blue-500/30'
                                            : isTk
                                            ? 'bg-cyan-950/40 text-cyan-300 border-cyan-500/30'
                                            : 'bg-[#0A0E17] text-slate-300 border-[#141B29]'
                                        }`}
                                      >
                                        <i
                                          className={`fa-brands ${
                                            isInsta
                                              ? 'fa-instagram text-rose-400'
                                              : isWa
                                              ? 'fa-whatsapp text-emerald-400'
                                              : isFb
                                              ? 'fa-facebook-f text-blue-400'
                                              : isTk
                                              ? 'fa-tiktok text-cyan-400'
                                              : 'fa-hashtag text-slate-400'
                                          } text-[9px]`}
                                        ></i>
                                        <span>{ch}</span>
                                      </span>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                          </td>
                          <td className="py-3.5 font-tech text-slate-300">
                            <i className="fa-solid fa-users text-slate-500 mr-1.5"></i>
                            <strong>{getEnterpriseOperatorCount(ent.id, ent.operatorCount)}</strong>
                          </td>
                          <td className="py-3.5 font-tech">
                            <div className="space-y-1 w-36">
                              <div className="flex justify-between text-[10px]">
                                <span className="text-white font-bold">{ent.monthlyApiRequests.toLocaleString()}</span>
                                <span className="text-slate-500">/{ent.quotaLimit / 1000}k</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-[#080C14] border border-[#141B29] overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    usagePercent > 80 ? 'bg-amber-400' : 'bg-[#00F0FF]'
                                  }`}
                                  style={{ width: `${Math.min(usagePercent, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 font-tech text-slate-300">
                            {(ent.storageMb / 1024).toFixed(1)} GB
                          </td>
                          <td className="py-3.5 font-tech text-emerald-400 font-bold">
                            {ent.slaPercent}%
                          </td>
                          <td className="py-3.5">
                            <span className="inline-flex items-center gap-1 text-[10px] text-cyan-300 font-tech">
                              <i className="fa-solid fa-lock text-[9px] text-[#00F0FF]"></i>
                              RLS OK
                            </span>
                          </td>
                          <td className="py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEnterprise(ent);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-[#0E1524] hover:bg-[#141E33] text-[#00F0FF] border border-[#00F0FF]/30 text-[10px] font-bold font-tech transition"
                              >
                                Ficha Técnica
                              </button>
                              {ent.id !== 'b2d78f5f-95e6-4191-8ec6-a958e8c10bbc' && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEnterpriseToDelete(ent);
                                  }}
                                  className="w-7 h-7 rounded-lg bg-rose-950/20 hover:bg-rose-900/40 text-rose-400 hover:text-rose-300 border border-rose-500/30 flex items-center justify-center text-[11px] transition"
                                  title={`Eliminar ${ent.name}`}
                                >
                                  <i className="fa-solid fa-trash"></i>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal / Ficha Técnica Detallada de Empresa Seleccionada (Portal al body para evitar recortes z-index y viewport) */}
      {selectedEnterprise &&
        createPortal(
          <div className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-start justify-center p-4 sm:p-6 overflow-y-auto">
            <div className="relative w-full max-w-2xl bg-[#05080F] border border-[#162032] rounded-3xl p-6 sm:p-7 shadow-2xl shadow-black/90 space-y-5 my-auto">
              {/* Encabezado: Identidad Clara de la Empresa */}
              <div className="flex items-start justify-between pb-4 border-b border-[#141B29]">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00F0FF]/20 to-[#0072FF]/20 text-[#00F0FF] border border-[#00F0FF]/40 flex items-center justify-center text-xl font-bold font-tech shadow-md shadow-[#00F0FF]/10">
                    {selectedEnterprise.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-lg font-bold text-white font-tech">
                        {selectedEnterprise.name}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-tech ${
                          selectedEnterprise.plan === 'Enterprise'
                            ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                            : 'bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30'
                        }`}
                      >
                        Plan {selectedEnterprise.plan}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold font-tech">
                        {selectedEnterprise.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-tech mt-1 flex items-center gap-2">
                      <span>Sector: <strong className="text-slate-200">{selectedEnterprise.industry}</strong></span>
                      <span>•</span>
                      <span>Sede: <strong className="text-slate-200">{selectedEnterprise.location}</strong></span>
                      <span>•</span>
                      <span className="font-mono text-cyan-400">ID: {selectedEnterprise.id.substring(0, 12)}...</span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedEnterprise(null)}
                  className="w-8 h-8 rounded-lg bg-[#080C14] hover:bg-[#121824] text-slate-400 hover:text-white border border-[#141B29] flex items-center justify-center text-xs transition"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>

              {/* Canales Vinculados Dinámicos de esta Empresa */}
              <div className="p-4 rounded-2xl bg-[#080C14] border border-[#141B29] space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-tech flex items-center gap-2">
                    <i className="fa-solid fa-share-nodes text-[#00F0FF]"></i>
                    <span>Canales de Redes Sociales Vinculados a esta Empresa</span>
                  </h4>
                  <span className="text-[10px] text-slate-400 font-tech">
                    {getEnterpriseActiveChannels(selectedEnterprise.id, selectedEnterprise.activeChannels).length} canales
                  </span>
                </div>

                {(() => {
                  const entChannels = getEnterpriseActiveChannels(selectedEnterprise.id, selectedEnterprise.activeChannels);
                  if (entChannels.length === 0) {
                    return (
                      <div className="p-3 rounded-xl bg-[#05080F] border border-[#162032] text-xs text-slate-400 italic font-tech">
                        Esta empresa aún no ha conectado canales de atención en su panel.
                      </div>
                    );
                  }
                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {entChannels.map((ch) => {
                        const chLower = ch.toLowerCase();
                        const isInsta = chLower.includes('instagram');
                        const isWa = chLower.includes('whatsapp');
                        const isFb = chLower.includes('facebook');
                        const isTk = chLower.includes('tiktok');
                        return (
                          <div
                            key={ch}
                            className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-tech ${
                              isInsta
                                ? 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                                : isWa
                                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                                : isFb
                                ? 'bg-blue-950/20 border-blue-500/30 text-blue-300'
                                : isTk
                                ? 'bg-cyan-950/20 border-cyan-500/30 text-cyan-300'
                                : 'bg-[#05080F] border-[#162032] text-slate-300'
                            }`}
                          >
                            <i
                              className={`fa-brands ${
                                isInsta
                                  ? 'fa-instagram text-rose-400'
                                  : isWa
                                  ? 'fa-whatsapp text-emerald-400'
                                  : isFb
                                  ? 'fa-facebook-f text-blue-400'
                                  : isTk
                                  ? 'fa-tiktok text-cyan-400'
                                  : 'fa-hashtag text-slate-400'
                              } text-sm`}
                            ></i>
                            <div className="truncate">
                              <span className="font-bold block truncate">{ch}</span>
                              <span className="text-[9px] text-emerald-400 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                Activo
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Ficha de Información de Infraestructura y Tráfico */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-[#080C14] border border-[#141B29]">
                  <span className="text-[10px] text-slate-500 font-tech uppercase">Tráfico Mensual</span>
                  <p className="text-sm font-bold text-white font-tech mt-1">
                    {selectedEnterprise.monthlyApiRequests.toLocaleString()}
                  </p>
                  <span className="text-[10px] text-slate-400">eventos procesados</span>
                </div>

                <div className="p-3 rounded-xl bg-[#080C14] border border-[#141B29]">
                  <span className="text-[10px] text-slate-500 font-tech uppercase">Operadores</span>
                  <p className="text-sm font-bold text-white font-tech mt-1">
                    {getEnterpriseOperatorCount(selectedEnterprise.id, selectedEnterprise.operatorCount)} asignados
                  </p>
                  <span className="text-[10px] text-slate-400">cuota activa</span>
                </div>

                <div className="p-3 rounded-xl bg-[#080C14] border border-[#141B29]">
                  <span className="text-[10px] text-slate-500 font-tech uppercase">Almacenamiento</span>
                  <p className="text-sm font-bold text-white font-tech mt-1">
                    {(selectedEnterprise.storageMb / 1024).toFixed(1)} GB
                  </p>
                  <span className="text-[10px] text-slate-400">PostgreSQL aislado</span>
                </div>

                <div className="p-3 rounded-xl bg-[#080C14] border border-[#141B29]">
                  <span className="text-[10px] text-slate-500 font-tech uppercase">SLA Plataforma</span>
                  <p className="text-sm font-bold text-emerald-400 font-tech mt-1">
                    {selectedEnterprise.slaPercent}%
                  </p>
                  <span className="text-[10px] text-emerald-500">Cumplido</span>
                </div>
              </div>

              {/* Operadores Registrados de esta Empresa */}
              {(() => {
                const agentsList = getEnterpriseAgents(selectedEnterprise.id);
                if (agentsList.length > 0) {
                  return (
                    <div className="p-3.5 rounded-xl bg-[#080C14] border border-[#141B29] space-y-2">
                      <h4 className="text-xs font-bold text-slate-300 font-tech flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <i className="fa-solid fa-users-gear text-cyan-400"></i>
                          Operadores Registrados ({agentsList.length})
                        </span>
                      </h4>
                      <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1">
                        {agentsList.map((ag: any) => (
                          <div key={ag.id} className="flex items-center justify-between p-2 rounded-lg bg-[#05080F] text-xs font-tech">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 flex items-center justify-center text-[10px] font-bold">
                                {ag.fullName?.charAt(0) || 'U'}
                              </span>
                              <div>
                                <span className="text-white font-bold block leading-none">{ag.fullName}</span>
                                <span className="text-[10px] text-slate-500">{ag.email}</span>
                              </div>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                              {ag.role}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Datos Técnicos y Privacidad */}
              <div className="p-3.5 rounded-xl bg-[#080C14] border border-[#141B29] space-y-1.5 text-xs text-slate-400 font-tech">
                <div className="flex justify-between">
                  <span>Tenant UUID:</span>
                  <span className="font-mono text-slate-300">{selectedEnterprise.id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Líder Técnico Empresa:</span>
                  <span className="text-slate-300">{selectedEnterprise.techLead}</span>
                </div>
                <div className="flex justify-between">
                  <span>Aislamiento de Datos:</span>
                  <span className="text-emerald-400 font-bold">✓ Row-Level Security (Ley 1581)</span>
                </div>
              </div>

              {/* Botones de Acción Rápida para Super Admin */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#141B29]">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const entName = selectedEnterprise.name;
                      setSelectedEnterprise(null);
                      if (onNavigateToSuperAdminSection) {
                        onNavigateToSuperAdminSection('governance', entName);
                      }
                    }}
                    className="px-3 py-2 rounded-xl bg-[#00F0FF]/10 hover:bg-[#00F0FF]/20 border border-[#00F0FF]/30 text-[#00F0FF] text-xs font-semibold flex items-center gap-1.5 transition font-tech"
                    title={`Ver eventos de auditoría de ${selectedEnterprise.name}`}
                  >
                    <i className="fa-solid fa-clock-rotate-left text-xs"></i>
                    <span>Ver Auditoría de esta Empresa</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedEnterprise(null);
                      if (onNavigateToSuperAdminSection) {
                        onNavigateToSuperAdminSection('supportConsole');
                      }
                    }}
                    className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition font-tech"
                    title="Abrir consola de soporte técnico de Super Admin"
                  >
                    <i className="fa-solid fa-headset text-xs"></i>
                    <span>Abrir Consola Soporte</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {selectedEnterprise.id !== 'b2d78f5f-95e6-4191-8ec6-a958e8c10bbc' ? (
                    <button
                      type="button"
                      onClick={() => {
                        const ent = selectedEnterprise;
                        setSelectedEnterprise(null);
                        setEnterpriseToDelete(ent);
                      }}
                      className="px-3 py-2 rounded-xl bg-rose-950/30 hover:bg-rose-900/50 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition font-tech"
                    >
                      <i className="fa-solid fa-trash text-xs"></i>
                      <span>Eliminar Empresa</span>
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-tech flex items-center gap-1">
                      <i className="fa-solid fa-shield text-cyan-400"></i>
                      Sede Central Protegida
                    </span>
                  )}

                  <button
                    onClick={() => setSelectedEnterprise(null)}
                    className="px-4 py-2 rounded-xl bg-[#0E1524] hover:bg-[#141E33] border border-[#162032] text-xs font-semibold text-white transition font-tech"
                  >
                    Cerrar Ficha
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Modal: Crear Nueva Empresa y Administrador (Portal al body) */}
      {isCreateModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[99999] flex items-start justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
            <div className="relative w-full max-w-2xl bg-[#05080F] border border-[#141B29] hover:border-[#00F0FF]/30 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/90 my-auto transition">
              {/* Encabezado del Modal */}
              <div className="flex items-center justify-between pb-4 border-b border-[#141B29] mb-6">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#00F0FF]/20 to-[#0072FF]/20 text-[#00F0FF] border border-[#00F0FF]/30 flex items-center justify-center text-base shadow-sm">
                    <i className="fa-solid fa-building-circle-check"></i>
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-white font-tech">
                      {createSuccessData ? 'Empresa Registrada Exitosamente' : 'Registrar Nueva Empresa & Administrador'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {createSuccessData
                        ? 'Espacio de trabajo creado y habilitado en la base de datos con RLS.'
                        : 'Crea el espacio de trabajo (Tenant) aislado y su credencial de administración principal.'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="w-8 h-8 rounded-lg bg-[#080C14] hover:bg-[#121824] text-slate-400 hover:text-white border border-[#141B29] flex items-center justify-center text-xs transition"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>

              {/* Pantalla de Éxito / Resumen de Credenciales */}
              {createSuccessData ? (
                <div className="space-y-6">
                  <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/40 flex items-start gap-3">
                    <span className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm flex-shrink-0 mt-0.5">
                      <i className="fa-solid fa-check"></i>
                    </span>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-emerald-300 font-tech">
                        ¡Espacio de Trabajo y Administrador Creados en PostgreSQL!
                      </h4>
                      <p className="text-xs text-emerald-400/90 leading-relaxed">
                        Se ha generado la partición segura para <strong>{createSuccessData.enterprise.name}</strong> y el registro inmutable en el AuditLog de la plataforma.
                      </p>
                    </div>
                  </div>

                  {/* Tarjeta con Credenciales */}
                  <div className="p-5 rounded-2xl bg-[#080C14] border border-[#141B29] space-y-4 font-tech">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <i className="fa-solid fa-key text-[#00F0FF]"></i>
                      <span>Credenciales de Acceso para el Administrador</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-[#05080F] border border-[#162032]">
                        <span className="text-[10px] text-slate-500 uppercase block">Empresa / Tenant</span>
                        <span className="text-white font-bold block mt-0.5">{createSuccessData.enterprise.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">Plan: {createSuccessData.enterprise.plan}</span>
                      </div>

                      <div className="p-3 rounded-xl bg-[#05080F] border border-[#162032]">
                        <span className="text-[10px] text-slate-500 uppercase block">Administrador Designado</span>
                        <span className="text-white font-bold block mt-0.5">{createSuccessData.administrator.fullName}</span>
                        <span className="text-[10px] text-amber-400">Rol: {createSuccessData.administrator.role}</span>
                      </div>

                      <div className="p-3 rounded-xl bg-[#05080F] border border-[#162032]">
                        <span className="text-[10px] text-slate-500 uppercase block">Correo de Acceso</span>
                        <span className="text-[#00F0FF] font-mono font-bold block mt-0.5">
                          {createSuccessData.administrator.email}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-[#05080F] border border-[#162032]">
                        <span className="text-[10px] text-slate-500 uppercase block">Contraseña Inicial</span>
                        <span className="text-emerald-400 font-mono font-bold block mt-0.5">
                          {createSuccessData.administrator.initialPassword}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#05080F] border border-[#162032] flex items-center justify-between text-xs">
                      <span className="text-slate-400">UUID Espacio de Trabajo:</span>
                      <span className="font-mono text-slate-300 text-[11px]">{createSuccessData.enterprise.id}</span>
                    </div>
                  </div>

                  {/* Acciones de Cierre */}
                  <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        const textToCopy = `Credenciales de Acceso KorevX:\nEmpresa: ${createSuccessData.enterprise.name}\nAdmin: ${createSuccessData.administrator.fullName}\nEmail: ${createSuccessData.administrator.email}\nContraseña: ${createSuccessData.administrator.initialPassword}\nPortal: http://localhost:5173`;
                        navigator.clipboard.writeText(textToCopy);
                        setCopySuccess(true);
                        setTimeout(() => setCopySuccess(false), 3000);
                      }}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#0E1524] hover:bg-[#141E33] border border-[#162032] text-xs font-semibold text-slate-300 hover:text-white flex items-center justify-center gap-2 transition font-tech"
                    >
                      <i className={`fa-solid ${copySuccess ? 'fa-check text-emerald-400' : 'fa-copy'}`}></i>
                      <span>{copySuccess ? '¡Credenciales Copiadas!' : 'Copiar Credenciales'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsCreateModalOpen(false)}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#00F0FF] hover:bg-[#00D7E5] text-[#030508] font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-[#00F0FF]/20 font-tech"
                    >
                      <span>Listo, Volver al Dashboard</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Formulario de Registro */
                <form onSubmit={handleCreateEnterprise} className="space-y-5">
                  {formError && (
                    <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
                      <i className="fa-solid fa-triangle-exclamation text-rose-400"></i>
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* Bloque 1: Datos de la Empresa */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-[#00F0FF] uppercase tracking-wider font-tech flex items-center gap-2">
                      <i className="fa-solid fa-building"></i>
                      <span>1. Datos de la Empresa (Tenant)</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1 font-tech">
                          Razón Social / Nombre Comercial *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ej: Distribuidora Andina SAS"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-3 py-2 bg-[#080C14] border border-[#141B29] focus:border-[#00F0FF]/60 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1 font-tech">
                          Sector Industrial
                        </label>
                        <select
                          value={formData.industry}
                          onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                          className="w-full px-3 py-2 bg-[#080C14] border border-[#141B29] focus:border-[#00F0FF]/60 rounded-xl text-xs text-white focus:outline-none transition"
                        >
                          <option value="Retail & E-commerce">Retail & E-commerce</option>
                          <option value="Tecnología & Software">Tecnología & Software</option>
                          <option value="Salud & Clínicas">Salud & Clínicas</option>
                          <option value="Fintech & Finanzas">Fintech & Finanzas</option>
                          <option value="Educación & Capacitación">Educación & Capacitación</option>
                          <option value="Bienes Raíces & Inmobiliaria">Bienes Raíces & Inmobiliaria</option>
                          <option value="Servicios Profesionales">Servicios Profesionales</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1 font-tech">
                          Plan de Suscripción
                        </label>
                        <select
                          value={formData.plan}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              plan: e.target.value as 'Enterprise' | 'Business Pro' | 'Starter',
                              quotaLimit:
                                e.target.value === 'Enterprise'
                                  ? 100000
                                  : e.target.value === 'Business Pro'
                                  ? 50000
                                  : 20000,
                              maxOperators:
                                e.target.value === 'Enterprise' ? 15 : e.target.value === 'Business Pro' ? 6 : 2,
                            })
                          }
                          className="w-full px-3 py-2 bg-[#080C14] border border-[#141B29] focus:border-[#00F0FF]/60 rounded-xl text-xs text-white focus:outline-none transition"
                        >
                          <option value="Enterprise">Enterprise (100k req/mes, 15 agentes, SLA 99.99%)</option>
                          <option value="Business Pro">Business Pro (50k req/mes, 6 agentes, SLA 99.9%)</option>
                          <option value="Starter">Starter (20k req/mes, 2 agentes, SLA 99.5%)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1 font-tech">
                          Ciudad / Ubicación
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: Bogotá, Colombia"
                          value={formData.location}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                          className="w-full px-3 py-2 bg-[#080C14] border border-[#141B29] focus:border-[#00F0FF]/60 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1 font-tech">
                          Límite de Operadores Simultáneos
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={formData.maxOperators}
                          onChange={(e) => setFormData({ ...formData, maxOperators: parseInt(e.target.value, 10) || 1 })}
                          className="w-full px-3 py-2 bg-[#080C14] border border-[#141B29] focus:border-[#00F0FF]/60 rounded-xl text-xs text-white focus:outline-none transition"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bloque 2: Datos del Administrador */}
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
                          placeholder="Ej: Laura Morales"
                          value={formData.adminFullName}
                          onChange={(e) => setFormData({ ...formData, adminFullName: e.target.value })}
                          className="w-full px-3 py-2 bg-[#080C14] border border-[#141B29] focus:border-[#00F0FF]/60 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1 font-tech">
                          Correo Corporativo *
                        </label>
                        <input
                          type="email"
                          required
                          placeholder="admin@empresa.com"
                          value={formData.adminEmail}
                          onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                          className="w-full px-3 py-2 bg-[#080C14] border border-[#141B29] focus:border-[#00F0FF]/60 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1 font-tech flex items-center justify-between">
                          <span>Contraseña Inicial de Acceso</span>
                          <span className="text-[10px] text-slate-500 font-normal">Por defecto: KorevX.2026!</span>
                        </label>
                        <input
                          type="text"
                          placeholder="KorevX.2026!"
                          value={formData.adminPassword}
                          onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                          className="w-full px-3 py-2 bg-[#080C14] border border-[#141B29] focus:border-[#00F0FF]/60 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none font-mono transition"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Nota de Aislamiento Ley 1581 */}
                  <div className="p-3 rounded-xl bg-[#080C14] border border-[#141B29] flex items-center gap-2.5 text-[11px] text-slate-400">
                    <i className="fa-solid fa-lock text-emerald-400 text-xs"></i>
                    <span>
                      El tenant quedará aislado criptográficamente con Row-Level Security. El Super Admin no tendrá acceso a los chats de clientes de esta empresa.
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
                          <span>Creando en Base de Datos...</span>
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

      {/* Modal de Confirmación de Eliminación de Empresa (Portal al body) */}
      {enterpriseToDelete &&
        createPortal(
          <div className="fixed inset-0 z-[99999] flex items-start justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
            <div className="bg-[#070B14] border border-rose-500/40 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl shadow-rose-950/50 space-y-4 my-auto">
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
                Estás a punto de eliminar a <strong className="text-white">{enterpriseToDelete.name}</strong>. Se destruirá su espacio de trabajo aislado (Tenant), sus usuarios vinculados y sus configuraciones conforme a los protocolos de seguridad y Ley 1581.
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
    </section>
  );
};
