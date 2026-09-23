import { Controller, Get, Post, Delete, Param, Query, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { EnterprisesService, CreateEnterpriseDto } from './enterprises.service';

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
}
