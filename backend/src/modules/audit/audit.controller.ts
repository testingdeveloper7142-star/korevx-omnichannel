import { Controller, Get, Post, Param, Query, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { AuditService } from './audit.service';
import { AuditAction, AuditResource } from '@prisma/client';

@ApiTags('Audit & Governance')
@Controller('api/v1/audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('conversations/:id/timeline')
  @ApiOperation({ summary: 'Obtener la línea de tiempo completa y ciclo de vida de una conversación' })
  async getTimeline(@Param('id') conversationId: string) {
    return this.auditService.getConversationTimeline(conversationId);
  }

  @Get('logs')
  @ApiOperation({ summary: 'Consultar bitácora general de auditoría inmutable con paginación por cursores' })
  async getAuditLogs(
    @Query('workspaceId') workspaceId?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('userId') userId?: string,
    @Query('action') action?: AuditAction,
    @Query('resource') resource?: AuditResource,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.auditService.getAuditLogs({
      workspaceId,
      limit: limit ? parseInt(limit, 10) : 100,
      cursor,
      userId,
      action,
      resource,
      startDate,
      endDate,
    });
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Listar sesiones de usuario activas en el sistema' })
  async getActiveSessions(@Query('limit') limit?: string) {
    return this.auditService.getActiveSessions(limit ? parseInt(limit, 10) : 100);
  }

  @Post('sessions/:id/revoke')
  @ApiOperation({ summary: 'Revocar sesión de usuario activa' })
  async revokeSession(@Param('id') sessionId: string) {
    return this.auditService.revokeSession(sessionId);
  }

  @Post('login-event')
  @ApiOperation({ summary: 'Registrar inicio de sesión fidedigno extrayendo IP y User-Agent de cabeceras HTTP' })
  async recordLoginEvent(
    @Req() req: Request,
    @Body() body: { userId: string },
  ) {
    const rawIp = req.headers['x-forwarded-for'] as string;
    const ipAddress = rawIp ? rawIp.split(',')[0].trim() : req.socket.remoteAddress || '127.0.0.1';
    const userAgent = (req.headers['user-agent'] as string) || 'Unknown Browser';

    return this.auditService.recordLogin(body.userId, ipAddress, userAgent);
  }

  @Post('logout-event')
  @ApiOperation({ summary: 'Registrar cierre de sesión seguro' })
  async recordLogoutEvent(
    @Body() body: { userId: string },
  ) {
    return this.auditService.recordLogout(body.userId);
  }

  @Post('security-event')
  @ApiOperation({ summary: 'Registrar evento de seguridad crítica o exportación de datos con firma digital' })
  async recordSecurityEvent(
    @Req() req: Request,
    @Body()
    body: {
      workspaceId?: string;
      eventType: 'LOGIN_FAILED' | 'DATA_EXPORT' | 'PRIVILEGE_ELEVATION' | 'UNAUTHORIZED_ACCESS';
      details: string;
      actorEmail?: string;
      rowCount?: number;
    },
  ) {
    const rawIp = req.headers['x-forwarded-for'] as string;
    const ipAddress = rawIp ? rawIp.split(',')[0].trim() : req.socket.remoteAddress || '127.0.0.1';
    const userAgent = (req.headers['user-agent'] as string) || 'KorevX Security Agent';

    return this.auditService.recordSecurityEvent({
      workspaceId: body.workspaceId,
      eventType: body.eventType,
      details: body.details,
      actorEmail: body.actorEmail,
      ipAddress,
      userAgent,
      rowCount: body.rowCount,
    });
  }

  @Post('log-event')
  @ApiOperation({ summary: 'Registrar evento general de trazabilidad y auditoría (Ley 1581)' })
  async recordLogEvent(
    @Req() req: Request,
    @Body()
    body: {
      workspaceId?: string;
      userId?: string;
      action?: AuditAction;
      resource?: AuditResource;
      resourceId?: string;
      description: string;
      details?: any;
    },
  ) {
    const rawIp = req.headers['x-forwarded-for'] as string;
    const ipAddress = rawIp ? rawIp.split(',')[0].trim() : req.socket.remoteAddress || '127.0.0.1';
    const userAgent = (req.headers['user-agent'] as string) || 'KorevX Web Client';

    return this.auditService.recordAudit({
      workspaceId: body.workspaceId || '00000000-0000-0000-0000-000000000000',
      userId: body.userId,
      action: body.action || AuditAction.UPDATE,
      resource: body.resource || AuditResource.CONVERSATION,
      resourceId: body.resourceId || 'GENERAL',
      description: body.description,
      newState: body.details,
      ipAddress,
      userAgent,
    });
  }
}
