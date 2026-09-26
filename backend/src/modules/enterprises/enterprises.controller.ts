import { Controller, Get, Post, Patch, Delete, Param, Query, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { EnterprisesService, CreateEnterpriseDto, ChannelLimits } from './enterprises.service';

@ApiTags('Enterprises & Tenants')
@Controller('api/v1/enterprises')
export class EnterprisesController {
  constructor(private readonly enterprisesService: EnterprisesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas las empresas registradas con telemetría de operadores y canales' })
  async getEnterprises() {
    return this.enterprisesService.listEnterprises();
  }

  @Post()
  @ApiOperation({ summary: 'Crear nueva Empresa (Tenant) y su Administrador Inicial con trazabilidad' })
  async createEnterprise(
    @Req() req: Request,
    @Body() body: CreateEnterpriseDto & { creatorUserId?: string },
  ) {
    const rawIp = req.headers['x-forwarded-for'] as string;
    const ipAddress = rawIp ? rawIp.split(',')[0].trim() : req.socket.remoteAddress || '127.0.0.1';
    const userAgent = (req.headers['user-agent'] as string) || 'KorevX SuperAdmin WebApp';

    return this.enterprisesService.createEnterpriseWithAdmin(
      body,
      body.creatorUserId,
      ipAddress,
      userAgent,
    );
  }

  @Patch(':id/channel-limits')
  @ApiOperation({ summary: 'Actualizar límites de redes sociales asignadas a una empresa' })
  async updateChannelLimits(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { channelLimits: Partial<ChannelLimits>; requesterUserId?: string },
  ) {
    const rawIp = req.headers['x-forwarded-for'] as string;
    const ipAddress = rawIp ? rawIp.split(',')[0].trim() : req.socket.remoteAddress || '127.0.0.1';
    const userAgent = (req.headers['user-agent'] as string) || 'KorevX SuperAdmin WebApp';

    return this.enterprisesService.updateChannelLimits(
      id,
      body.channelLimits,
      body.requesterUserId,
      ipAddress,
      userAgent,
    );
  }

  @Patch(':id/admin')
  @ApiOperation({ summary: 'Actualizar datos (nombre y correo) del administrador de una empresa' })
  async updateEnterpriseAdmin(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { adminFullName?: string; adminEmail?: string; requesterUserId?: string },
  ) {
    const rawIp = req.headers['x-forwarded-for'] as string;
    const ipAddress = rawIp ? rawIp.split(',')[0].trim() : req.socket.remoteAddress || '127.0.0.1';
    const userAgent = (req.headers['user-agent'] as string) || 'KorevX SuperAdmin WebApp';

    return this.enterprisesService.updateEnterpriseAdmin(
      id,
      body.adminFullName,
      body.adminEmail,
      body.requesterUserId,
      ipAddress,
      userAgent,
    );
  }

  @Patch(':id/operator-limit')
  @ApiOperation({ summary: 'Actualizar límite máximo de operadores permitidos para una empresa' })
  async updateMaxOperators(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { maxOperators: number; requesterUserId?: string },
  ) {
    const rawIp = req.headers['x-forwarded-for'] as string;
    const ipAddress = rawIp ? rawIp.split(',')[0].trim() : req.socket.remoteAddress || '127.0.0.1';
    const userAgent = (req.headers['user-agent'] as string) || 'KorevX SuperAdmin WebApp';

    return this.enterprisesService.updateMaxOperators(
      id,
      body.maxOperators,
      body.requesterUserId,
      ipAddress,
      userAgent,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar definitivamente una empresa (Workspace) y sus datos por Super Admin' })
  async deleteEnterprise(
    @Req() req: Request,
    @Param('id') id: string,
    @Query('userId') userId?: string,
  ) {
    const rawIp = req.headers['x-forwarded-for'] as string;
    const ipAddress = rawIp ? rawIp.split(',')[0].trim() : req.socket.remoteAddress || '127.0.0.1';
    const userAgent = (req.headers['user-agent'] as string) || 'KorevX SuperAdmin WebApp';

    return this.enterprisesService.deleteEnterprise(id, userId, ipAddress, userAgent);
  }

  @Patch(':id/settings')
  @ApiOperation({ summary: 'Actualizar configuración propia de la empresa (nombre, logo, contacto)' })
  async updateEnterpriseSettings(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const rawIp = req.headers['x-forwarded-for'] as string;
    const ipAddress = rawIp ? rawIp.split(',')[0].trim() : req.socket.remoteAddress || '127.0.0.1';
    const userAgent = (req.headers['user-agent'] as string) || 'KorevX Omnichannel Client';

    return this.enterprisesService.updateEnterpriseSettings(
      id,
      body,
      body.requesterUserId,
      ipAddress,
      userAgent,
    );
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Bloquear o reactivar acceso a una empresa completa' })
  async toggleEnterpriseStatus(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { status: 'ACTIVE' | 'SUSPENDED'; requesterUserId?: string },
  ) {
    const rawIp = req.headers['x-forwarded-for'] as string;
    const ipAddress = rawIp ? rawIp.split(',')[0].trim() : req.socket.remoteAddress || '127.0.0.1';
    const userAgent = (req.headers['user-agent'] as string) || 'KorevX SuperAdmin WebApp';

    return this.enterprisesService.toggleEnterpriseStatus(
      id,
      body.status,
      body.requesterUserId,
      ipAddress,
      userAgent,
    );
  }

  @Get(':id/operators')
  @ApiOperation({ summary: 'Obtener lista de operadores de una empresa' })
  async getEnterpriseOperators(@Param('id') id: string) {
    return this.enterprisesService.getEnterpriseOperators(id);
  }

  @Post(':id/operators')
  @ApiOperation({ summary: 'Crear un nuevo operador para una empresa con límite estricto' })
  async createOperator(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { fullName: string; email: string; role?: string; requesterUserId?: string },
  ) {
    const rawIp = req.headers['x-forwarded-for'] as string;
    const ipAddress = rawIp ? rawIp.split(',')[0].trim() : req.socket.remoteAddress || '127.0.0.1';
    const userAgent = (req.headers['user-agent'] as string) || 'KorevX Client';

    return this.enterprisesService.createOperator(
      id,
      body,
      body.requesterUserId,
      ipAddress,
      userAgent,
    );
  }

  @Patch(':id/operators/:operatorId/status')
  @ApiOperation({ summary: 'Bloquear o desbloquear a un operador individual' })
  async toggleUserBlock(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('operatorId') operatorId: string,
    @Body() body: { isBlocked: boolean; requesterUserId?: string },
  ) {
    const rawIp = req.headers['x-forwarded-for'] as string;
    const ipAddress = rawIp ? rawIp.split(',')[0].trim() : req.socket.remoteAddress || '127.0.0.1';
    const userAgent = (req.headers['user-agent'] as string) || 'KorevX SuperAdmin WebApp';

    return this.enterprisesService.toggleUserBlock(
      id,
      operatorId,
      body.isBlocked,
      body.requesterUserId,
      ipAddress,
      userAgent,
    );
  }

  @Delete(':id/operators/:operatorId')
  @ApiOperation({ summary: 'Eliminar a un operador de una empresa' })
  async deleteOperator(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('operatorId') operatorId: string,
    @Query('requesterUserId') requesterUserId?: string,
  ) {
    const rawIp = req.headers['x-forwarded-for'] as string;
    const ipAddress = rawIp ? rawIp.split(',')[0].trim() : req.socket.remoteAddress || '127.0.0.1';
    const userAgent = (req.headers['user-agent'] as string) || 'KorevX Client';

    return this.enterprisesService.deleteOperator(
      id,
      operatorId,
      requesterUserId,
      ipAddress,
      userAgent,
    );
  }

  @Post('purge-all')
  @ApiOperation({ summary: 'Eliminar todas las empresas y datos de prueba manteniendo solo el Super Admin' })
  async purgeAllEnterprises(
    @Req() req: Request,
    @Body() body: { requesterUserId?: string },
  ) {
    const rawIp = req.headers['x-forwarded-for'] as string;
    const ipAddress = rawIp ? rawIp.split(',')[0].trim() : req.socket.remoteAddress || '127.0.0.1';
    const userAgent = (req.headers['user-agent'] as string) || 'KorevX SuperAdmin WebApp';

    return this.enterprisesService.purgeAllEnterprises(body.requesterUserId, ipAddress, userAgent);
  }
}
