import { Injectable, Logger, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditResource, UserRole } from '@prisma/client';
import * as crypto from 'crypto';

export interface ChannelLimits {
  FACEBOOK: number;
  INSTAGRAM: number;
  WHATSAPP: number;
  TIKTOK: number;
}

export interface CreateEnterpriseDto {
  name: string;
  nit?: string;
  industry?: string;
  plan?: 'Enterprise' | 'Business Pro' | 'Starter';
  quotaLimit?: number;
  maxOperators?: number;
  location?: string;
  techLead?: string;

  // Administrador inicial
  adminFullName: string;
  adminEmail: string;
  adminPassword?: string;

  // Límites de redes sociales por plataforma
  channelLimits?: Partial<ChannelLimits>;
}

@Injectable()
export class EnterprisesService {
  private readonly logger = new Logger(EnterprisesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Crea una nueva Empresa (Workspace / Tenant) y su Administrador Principal
   * con registro inmutable en AuditLog y firma de auditoría
   */
  async createEnterpriseWithAdmin(
    dto: CreateEnterpriseDto,
    creatorUserId?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    if (!dto.name || !dto.adminFullName || !dto.adminEmail) {
      throw new BadRequestException('El nombre de la empresa, nombre del administrador y correo son obligatorios.');
    }

    const emailClean = dto.adminEmail.toLowerCase().trim();

    const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!EMAIL_REGEX.test(emailClean)) {
      throw new BadRequestException('El formato del correo del administrador no es válido. Debe contener un dominio válido (ej. usuario@dominio.com).');
    }

    // Verificar si ya existe un usuario con ese correo
    const existingUser = await this.prisma.user.findUnique({
      where: { email: emailClean },
    });

    if (existingUser) {
      throw new ConflictException(`Ya existe un usuario registrado con el correo ${emailClean}`);
    }

    // Generar slug único para el Workspace
    const baseSlug = dto.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'empresa';
    
    const randomSuffix = crypto.randomBytes(3).toString('hex');
    const slug = `${baseSlug}-${randomSuffix}`;

    // Hash simple de contraseña (en producción usar argon2)
    const passwordHash = crypto
      .createHash('sha256')
      .update(dto.adminPassword || '123456789')
      .digest('hex');

    // 1. Crear Workspace en la base de datos
    const workspace = await this.prisma.workspace.create({
      data: {
        name: dto.name,
        slug: slug,
      },
    });

    // 2. Crear Administrador asignado a este Workspace
    const adminUser = await this.prisma.user.create({
      data: {
        workspaceId: workspace.id,
        email: emailClean,
        fullName: dto.adminFullName,
        role: UserRole.ADMIN,
        passwordHash: passwordHash,
        isOnline: false,
      },
    });

    const channelLimits: ChannelLimits = {
      FACEBOOK: typeof dto.channelLimits?.FACEBOOK === 'number' ? dto.channelLimits.FACEBOOK : 1,
      INSTAGRAM: typeof dto.channelLimits?.INSTAGRAM === 'number' ? dto.channelLimits.INSTAGRAM : 1,
      WHATSAPP: typeof dto.channelLimits?.WHATSAPP === 'number' ? dto.channelLimits.WHATSAPP : 1,
      TIKTOK: typeof dto.channelLimits?.TIKTOK === 'number' ? dto.channelLimits.TIKTOK : 0,
    };

    // 3. Crear sesión de auditoría inmutable
    const description = `Alta de nueva Empresa "${dto.name}" (NIT: ${dto.nit || 'N/A'}, Plan: ${dto.plan || 'Business Pro'}, Sector: ${dto.industry || 'General'}) y creación de su Administrador Principal "${dto.adminFullName}" (${emailClean}) por Super Admin. Límites Redes: FB:${channelLimits.FACEBOOK}, IG:${channelLimits.INSTAGRAM}, WA:${channelLimits.WHATSAPP}, TT:${channelLimits.TIKTOK}`;

    await this.auditService.recordAudit({
      workspaceId: workspace.id,
      userId: creatorUserId,
      action: AuditAction.CREATE,
      resource: AuditResource.USER,
      resourceId: adminUser.id,
      description,
      ipAddress: ipAddress || '127.0.0.1',
      userAgent: userAgent || 'KorevX SuperAdmin Console',
      newState: {
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        slug: workspace.slug,
        nit: dto.nit,
        industry: dto.industry || 'Tecnología & Servicios',
        plan: dto.plan || 'Business Pro',
        quotaLimit: dto.quotaLimit || 50000,
        maxOperators: dto.maxOperators || 5,
        location: dto.location || 'Colombia',
        adminId: adminUser.id,
        adminFullName: adminUser.fullName,
        adminEmail: adminUser.email,
        adminRole: adminUser.role,
        channelLimits,
        createdAt: new Date().toISOString(),
      },
    });

    this.logger.log(`Empresa creada con éxito: ${dto.name} (${workspace.id}) con Admin ${adminUser.email}`);

    return {
      success: true,
      enterprise: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        nit: dto.nit || 'En trámite',
        industry: dto.industry || 'Tecnología & Servicios',
        plan: dto.plan || 'Business Pro',
        activeChannels: [],
        channelLimits,
        operatorCount: 1, // El administrador inicial
        monthlyApiRequests: 0,
        quotaLimit: dto.quotaLimit || 50000,
        storageMb: 12, // Inicial
        slaPercent: 100.0,
        lastActive: 'Recién creada',
        location: dto.location || 'Bogotá, Colombia',
        techLead: dto.adminFullName,
        adminId: adminUser.id,
        adminEmail: adminUser.email,
        channelBreakdown: [],
        status: 'ACTIVE',
        createdAt: workspace.createdAt,
      },
      administrator: {
        id: adminUser.id,
        email: adminUser.email,
        fullName: adminUser.fullName,
        role: adminUser.role,
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        initialPassword: dto.adminPassword || '123456789',
      },
    };
  }

  /**
   * Lista todas las empresas (Workspaces) con telemetría de canales y usuarios
   */
  async listEnterprises() {
    const workspaces = await this.prisma.workspace.findMany({
      include: {
        users: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            isOnline: true,
            createdAt: true,
          },
        },
        channels: {
          select: {
            id: true,
            platform: true,
            accountName: true,
            isActive: true,
          },
        },
        auditLogs: {
          where: { resource: { in: [AuditResource.SETTINGS, AuditResource.USER] } },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        _count: {
          select: {
            conversations: true,
            users: true,
            channels: true,
            auditLogs: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return workspaces.map((ws) => {
      const admin = ws.users.find((u) => u.role === UserRole.ADMIN) || ws.users[0];
      const channelsList = Array.from(new Set(ws.channels.map((c) => c.platform)));

      // Extraer metadatos persistidos en el log de creación
      let industry = ws.id === 'b2d78f5f-95e6-4191-8ec6-a958e8c10bbc' ? 'Software & Telecomunicaciones' : 'Comercio & Servicios';
      let plan: 'Enterprise' | 'Business Pro' | 'Starter' = ws.id === 'b2d78f5f-95e6-4191-8ec6-a958e8c10bbc' ? 'Enterprise' : (ws.users.length > 5 ? 'Enterprise' : 'Business Pro');
      let quotaLimit = 50000;
      let maxOperators = 5;
      let nit = 'En trámite';
      let location = 'Bogotá, Colombia';
      let channelLimits: ChannelLimits = { FACEBOOK: 2, INSTAGRAM: 1, WHATSAPP: 1, TIKTOK: 0 };

      for (const log of ws.auditLogs) {
        const state = log.newState as any;
        if (state) {
          if (state.nit) nit = state.nit;
          if (state.industry) industry = state.industry;
          if (state.plan) plan = state.plan;
          if (state.quotaLimit) quotaLimit = Number(state.quotaLimit) || 50000;
          if (state.maxOperators) maxOperators = Number(state.maxOperators) || 5;
          if (state.location) location = state.location;
          if (state.channelLimits) channelLimits = { ...channelLimits, ...state.channelLimits };
          break;
        }
      }

      const totalRequests = ws._count.conversations * 12 + ws._count.auditLogs;
      const estimatedStorageMb = Math.round((ws._count.conversations * 0.8 + ws._count.auditLogs * 0.05 + ws._count.channels * 1.5) * 10) / 10;

      return {
        id: ws.id,
        name: ws.name,
        slug: ws.slug,
        nit,
        industry,
        plan,
        activeChannels: channelsList,
        channelLimits,
        maxOperators,
        operatorCount: ws.users.length || 1,
        monthlyApiRequests: totalRequests,
        quotaLimit,
        storageMb: estimatedStorageMb,
        slaPercent: 100,
        lastActive: 'Activo',
        location,
        techLead: admin ? admin.fullName : 'Admin Asignado',
        adminId: admin ? admin.id : null,
        adminEmail: admin ? admin.email : 'admin@korevx.com',
        channelBreakdown: channelsList.map((ch) => ({
          channel: ch,
          percent: channelsList.length > 0 ? Math.round(100 / channelsList.length) : 0,
        })),
        status: 'ACTIVE',
        createdAt: ws.createdAt,
      };
    });
  }

  /**
   * Actualiza los límites de canales permitidos por red social para una empresa
   */
  async updateChannelLimits(
    workspaceId: string,
    channelLimits: Partial<ChannelLimits>,
    requesterUserId?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new BadRequestException('Empresa no encontrada');
    }

    const description = `Límites de redes sociales actualizados para "${workspace.name}": FB:${channelLimits.FACEBOOK ?? 0}, IG:${channelLimits.INSTAGRAM ?? 0}, WA:${channelLimits.WHATSAPP ?? 0}, TT:${channelLimits.TIKTOK ?? 0}`;

    await this.auditService.recordAudit({
      workspaceId,
      userId: requesterUserId,
      action: AuditAction.UPDATE,
      resource: AuditResource.SETTINGS,
      resourceId: workspaceId,
      description,
      ipAddress: ipAddress || '127.0.0.1',
      userAgent: userAgent || 'KorevX SuperAdmin WebApp',
      newState: { channelLimits },
    });

    this.logger.log(`Límites actualizados para empresa ${workspace.name}: ${JSON.stringify(channelLimits)}`);

    return {
      success: true,
      workspaceId,
      channelLimits,
      message: `Límites de redes sociales actualizados exitosamente para ${workspace.name}`,
    };
  }

  /**
   * Elimina una empresa (Workspace) y sus recursos asociados de forma definitiva
   * registrando la auditoría inmutable
   */
  async deleteEnterprise(
    workspaceId: string,
    requesterUserId?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        users: true,
      },
    });

    if (!workspace) {
      // Si no está en BD (ej. empresa mock local), retorna éxito para limpiar frontend
      return { success: true, message: 'Empresa no encontrada en BD o ya eliminada' };
    }

    // Registrar en AuditLog central antes de eliminar
    const centralWorkspace = await this.prisma.workspace.findFirst({
      where: { slug: 'korevx-global' },
    });

    const targetWsId = centralWorkspace?.id || workspace.id;

    await this.auditService.recordAudit({
      workspaceId: targetWsId,
      userId: requesterUserId,
      action: AuditAction.DELETE,
      resource: AuditResource.USER,
      resourceId: workspace.id,
      description: `[ELIMINACIÓN DEFINITIVA] La empresa "${workspace.name}" (ID: ${workspace.id}) y sus usuarios administradores fueron eliminados por Super Admin.`,
      ipAddress: ipAddress || '127.0.0.1',
      userAgent: userAgent || 'KorevX SuperAdmin WebApp',
      previousState: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        usersCount: workspace.users.length,
      },
    });

    // Eliminar en cascada en Prisma
    await this.prisma.workspace.delete({
      where: { id: workspaceId },
    });

    this.logger.log(`Empresa ${workspace.name} (${workspaceId}) eliminada con éxito por Super Admin`);

    return { success: true, message: `Empresa "${workspace.name}" eliminada permanentemente` };
  }

  /**
   * Actualiza el nombre y correo del administrador de una empresa
   */
  async updateEnterpriseAdmin(
    workspaceId: string,
    adminFullName?: string,
    adminEmail?: string,
    requesterUserId?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { users: true },
    });

    if (!workspace) {
      throw new BadRequestException('Empresa no encontrada');
    }

    const admin = workspace.users.find((u) => u.role === UserRole.ADMIN) || workspace.users[0];
    if (!admin) {
      throw new BadRequestException('Administrador no encontrado para esta empresa');
    }

    const emailClean = adminEmail ? adminEmail.toLowerCase().trim() : admin.email;
    const nameClean = adminFullName ? adminFullName.trim() : admin.fullName;

    const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (adminEmail && !EMAIL_REGEX.test(emailClean)) {
      throw new BadRequestException('El formato del correo del administrador no es válido. Debe contener un dominio válido (ej. usuario@dominio.com).');
    }

    // Si cambia de correo, verificar que no esté ocupado
    if (emailClean !== admin.email) {
      const existing = await this.prisma.user.findUnique({ where: { email: emailClean } });
      if (existing && existing.id !== admin.id) {
        throw new ConflictException(`El correo ${emailClean} ya está en uso por otra cuenta`);
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: admin.id },
      data: {
        fullName: nameClean,
        email: emailClean,
      },
    });

    await this.auditService.recordAudit({
      workspaceId,
      userId: requesterUserId,
      action: AuditAction.UPDATE,
      resource: AuditResource.USER,
      resourceId: admin.id,
      description: `Administrador de "${workspace.name}" actualizado a "${nameClean}" (${emailClean}) por Super Admin.`,
      ipAddress: ipAddress || '127.0.0.1',
      userAgent: userAgent || 'KorevX SuperAdmin WebApp',
      newState: { adminFullName: nameClean, adminEmail: emailClean },
    });

    return {
      success: true,
      workspaceId,
      admin: {
        id: updatedUser.id,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
      },
      message: `Administrador de ${workspace.name} actualizado exitosamente`,
    };
  }

  /**
   * Actualiza el límite máximo de operadores permitidos para una empresa
   */
  async updateMaxOperators(
    workspaceId: string,
    maxOperators: number,
    requesterUserId?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new BadRequestException('Empresa no encontrada');
    }

    await this.auditService.recordAudit({
      workspaceId,
      userId: requesterUserId,
      action: AuditAction.UPDATE,
      resource: AuditResource.SETTINGS,
      resourceId: workspaceId,
      description: `Límite máximo de operadores para "${workspace.name}" ajustado a ${maxOperators} por Super Admin.`,
      ipAddress: ipAddress || '127.0.0.1',
      userAgent: userAgent || 'KorevX SuperAdmin WebApp',
      newState: { maxOperators },
    });

    return {
      success: true,
      workspaceId,
      maxOperators,
      message: `Límite de operadores para ${workspace.name} actualizado a ${maxOperators}`,
    };
  }

  /**
   * Actualiza la configuración propia de la empresa (nombre, logo, NIT, industria, etc.)
   */
  async updateEnterpriseSettings(
    workspaceId: string,
    settings: {
      name?: string;
      nit?: string;
      industry?: string;
      location?: string;
      logoUrl?: string;
      contactPhone?: string;
      contactEmail?: string;
      welcomeMessage?: string;
      allowExternalAudit?: boolean;
      allowSupportConsole?: boolean;
    },
    requesterUserId?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new BadRequestException('Empresa no encontrada');
    }

    if (settings.name && settings.name.trim() !== workspace.name) {
      await this.prisma.workspace.update({
        where: { id: workspaceId },
        data: { name: settings.name.trim() },
      });
    }

    await this.auditService.recordAudit({
      workspaceId,
      userId: requesterUserId,
      action: AuditAction.UPDATE,
      resource: AuditResource.SETTINGS,
      resourceId: workspaceId,
      description: `Configuración de perfil de empresa actualizada para "${settings.name || workspace.name}".`,
      ipAddress: ipAddress || '127.0.0.1',
      userAgent: userAgent || 'KorevX Omnichannel Client',
      newState: settings,
    });

    return {
      success: true,
      workspaceId,
      settings,
      message: 'Configuración de empresa actualizada exitosamente',
    };
  }

  /**
   * Elimina todas las empresas creadas, conversaciones, operadores y canales,
   * manteniendo ÚNICAMENTE el Super Administrador y el Workspace central.
   */
  async purgeAllEnterprises(
    requesterUserId?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // Buscar super admin
    const superAdminUser = await this.prisma.user.findFirst({
      where: { role: UserRole.SUPER_ADMIN },
    });

    // Eliminar mensajes, conversaciones y canales de forma segura
    await this.prisma.message.deleteMany({});
    await this.prisma.conversation.deleteMany({});
    await this.prisma.channelAccount.deleteMany({});

    // Eliminar usuarios excepto SUPER_ADMIN
    await this.prisma.user.deleteMany({
      where: {
        role: { not: UserRole.SUPER_ADMIN },
      },
    });

    // Eliminar workspaces secundarios
    const globalWorkspace = await this.prisma.workspace.findFirst({
      where: { slug: 'korevx-global' },
    });

    if (globalWorkspace) {
      await this.prisma.workspace.deleteMany({
        where: { id: { not: globalWorkspace.id } },
      });
    } else {
      const allWs = await this.prisma.workspace.findMany();
      if (allWs.length > 1) {
        const keepId = superAdminUser?.workspaceId || allWs[0].id;
        await this.prisma.workspace.deleteMany({
          where: { id: { not: keepId } },
        });
      }
    }

    this.logger.log('Purga total de empresas completada. Solo super admin conservado.');

    return {
      success: true,
      message: 'Reinicio total completado exitosamente. Todas las empresas y datos de prueba han sido eliminados.',
    };
  }
}
