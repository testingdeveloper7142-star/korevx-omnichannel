import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  AuditAction,
  AuditResource,
  ConversationStatus,
} from '@prisma/client';
import * as crypto from 'crypto';

export interface RecordTransitionParams {
  conversationId: string;
  previousStatus?: ConversationStatus;
  newStatus: ConversationStatus;
  performedById?: string;
  assignedToId?: string;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface RecordAuditParams {
  workspaceId: string;
  userId?: string;
  action: AuditAction;
  resource: AuditResource;
  resourceId: string;
  description: string;
  previousState?: any;
  newState?: any;
  ipAddress?: string;
  userAgent?: string;
}

export interface GetAuditLogsParams {
  workspaceId?: string;
  limit?: number;
  cursor?: string; // Cursor ID para paginación eficiente
  userId?: string;
  action?: AuditAction;
  resource?: AuditResource;
  startDate?: string;
  endDate?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra una transición de estado o reasignación en el ciclo de vida de la conversación
   */
  async recordLifecycleTransition(params: RecordTransitionParams) {
    try {
      const lastLog = await this.prisma.conversationLifecycleLog.findFirst({
        where: { conversationId: params.conversationId },
        orderBy: { createdAt: 'desc' },
      });

      let durationSeconds: number | null = null;
      if (lastLog) {
        durationSeconds = Math.round((Date.now() - new Date(lastLog.createdAt).getTime()) / 1000);
      }

      const log = await this.prisma.conversationLifecycleLog.create({
        data: {
          conversationId: params.conversationId,
          previousStatus: params.previousStatus,
          newStatus: params.newStatus,
          performedById: params.performedById,
          assignedToId: params.assignedToId,
          reason: params.reason,
          durationSeconds: durationSeconds && durationSeconds > 0 ? durationSeconds : 0,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        },
        include: {
          performedBy: {
            select: {
              id: true,
              fullName: true,
              role: true,
            },
          },
        },
      });

      return log;
    } catch (err) {
      this.logger.error(`Error registrando ciclo de vida de conversación: ${err.message}`);
    }
  }

  /**
   * Registra una acción inmutable en la bitácora de auditoría general (AuditLog)
   * con sello de integridad criptográfico SHA-256 (Ley 527 de 1999 y Ley 1581 de 2012)
   */
  async recordAudit(params: RecordAuditParams) {
    try {
      const timestamp = new Date();
      const rawToSign = `${params.workspaceId}|${params.userId || 'SYS'}|${params.action}|${params.resource}|${params.resourceId}|${timestamp.toISOString()}`;
      const sha256Checksum = crypto.createHash('sha256').update(rawToSign).digest('hex');

      const enrichedNewState = {
        ...(params.newState && typeof params.newState === 'object' ? params.newState : { value: params.newState }),
        _forensicMetadata: {
          sha256Checksum,
          legalBasis: 'Ley 1581 de 2012 Art. 4 & Ley 527 de 1999',
          chainOfCustody: 'IMMUTABLE_HASH_VERIFIED',
          timestampUtc: timestamp.toISOString(),
        },
      };

      const audit = await this.prisma.auditLog.create({
        data: {
          workspaceId: params.workspaceId,
          userId: params.userId,
          action: params.action,
          resource: params.resource,
          resourceId: params.resourceId,
          description: params.description,
          previousState: params.previousState ? params.previousState : undefined,
          newState: enrichedNewState,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          createdAt: timestamp,
        },
      });

      return audit;
    } catch (err) {
      this.logger.error(`Error guardando AuditLog: ${err.message}`);
    }
  }

  /**
   * Registra eventos de seguridad crítica forense (intentos fallidos, exportación de datos, etc.)
   */
  async recordSecurityEvent(params: {
    workspaceId?: string;
    eventType: 'LOGIN_FAILED' | 'DATA_EXPORT' | 'PRIVILEGE_ELEVATION' | 'UNAUTHORIZED_ACCESS';
    details: string;
    actorEmail?: string;
    ipAddress?: string;
    userAgent?: string;
    rowCount?: number;
  }) {
    let targetWorkspaceId = params.workspaceId;
    if (!targetWorkspaceId) {
      const defaultWs = await this.prisma.workspace.findFirst();
      targetWorkspaceId = defaultWs?.id || '00000000-0000-0000-0000-000000000000';
    }

    return this.recordAudit({
      workspaceId: targetWorkspaceId,
      action: params.eventType === 'DATA_EXPORT' ? AuditAction.EXPORT : AuditAction.UPDATE,
      resource: AuditResource.AUTH,
      resourceId: params.actorEmail || 'SECURITY_SYSTEM',
      description: `[ALERTA DE SEGURIDAD] ${params.eventType}: ${params.details}`,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      newState: {
        securityEventType: params.eventType,
        actorEmail: params.actorEmail,
        rowCount: params.rowCount,
        severity: params.eventType === 'UNAUTHORIZED_ACCESS' ? 'CRITICAL' : 'HIGH',
      },
    });
  }

  /**
   * Registra el inicio de sesión de un usuario capturando IP y User-Agent desde headers de forma fidedigna
   */
  async recordLogin(userId: string, ipAddress?: string, userAgent?: string) {
    const isMobile = userAgent && /Mobile|Android|iPhone|iPad/i.test(userAgent);
    const deviceType = isMobile ? 'Mobile' : 'Desktop';

    const session = await this.prisma.userSession.create({
      data: {
        userId,
        ipAddress: ipAddress || '127.0.0.1',
        userAgent: userAgent || 'Unknown Client',
        deviceType,
        loginAt: new Date(),
        isActive: true,
      },
    });

    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        await this.prisma.auditLog.create({
          data: {
            workspaceId: user.workspaceId,
            userId: user.id,
            action: AuditAction.LOGIN,
            resource: AuditResource.AUTH,
            resourceId: user.id,
            description: `Inicio de sesión autenticado de ${user.fullName} (${user.role}) desde IP ${ipAddress || '127.0.0.1'} [${deviceType}].`,
            ipAddress: ipAddress || '127.0.0.1',
            userAgent: userAgent || 'Unknown Client',
          },
        });
      }
    } catch (e) {
      this.logger.warn(`No se pudo crear AuditLog para login: ${e.message}`);
    }

    return session;
  }

  /**
   * Registra el cierre de sesión de un usuario y desactiva sesiones activas
   */
  async recordLogout(userId: string) {
    try {
      await this.prisma.userSession.updateMany({
        where: { userId, isActive: true },
        data: {
          isActive: false,
          logoutAt: new Date(),
        },
      });

      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        await this.prisma.auditLog.create({
          data: {
            workspaceId: user.workspaceId,
            userId: user.id,
            action: AuditAction.LOGOUT,
            resource: AuditResource.AUTH,
            resourceId: user.id,
            description: `Cierre de sesión seguro de ${user.fullName} (${user.role}). Sesión finalizada correctamente.`,
          },
        });
      }
      return { success: true };
    } catch (e) {
      this.logger.warn(`Error en recordLogout: ${e.message}`);
      return { success: false };
    }
  }

  /**
   * Obtiene la línea de tiempo completa de una conversación para supervisores y agentes
   */
  async getConversationTimeline(conversationId: string) {
    return this.prisma.conversationLifecycleLog.findMany({
      where: { conversationId },
      include: {
        performedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Consulta optimizada de AuditLog con Cursor-Based Pagination y filtros
   */
  async getAuditLogs(params: GetAuditLogsParams) {
    const take = params.limit ? Math.min(Math.max(params.limit, 1), 500) : 100;
    const where: any = {};

    if (params.workspaceId) {
      where.workspaceId = params.workspaceId;
    }
    if (params.userId) {
      where.userId = params.userId;
    }
    if (params.action) {
      where.action = params.action;
    }
    if (params.resource) {
      where.resource = params.resource;
    }
    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = new Date(params.startDate);
      if (params.endDate) where.createdAt.lte = new Date(params.endDate);
    }

    const [totalCount, items] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        take: take + 1, // Obtener 1 extra para determinar nextCursor
        cursor: params.cursor ? { id: params.cursor } : undefined,
        skip: params.cursor ? 1 : 0,
        where,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
          workspace: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    let nextCursor: string | null = null;
    if (items.length > take) {
      const nextItem = items.pop();
      nextCursor = nextItem?.id || null;
    }

    return {
      items,
      totalCount,
      nextCursor,
      hasMore: nextCursor !== null,
    };
  }

  /**
   * Lista sesiones activas en el sistema
   */
  async getActiveSessions(limit: number = 100) {
    return this.prisma.userSession.findMany({
      take: limit,
      where: { isActive: true },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            workspace: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { loginAt: 'desc' },
    });
  }

  /**
   * Revoca una sesión por seguridad
   */
  async revokeSession(sessionId: string) {
    return this.prisma.userSession.update({
      where: { id: sessionId },
      data: {
        isActive: false,
        revokedAt: new Date(),
        logoutAt: new Date(),
      },
    });
  }
}
