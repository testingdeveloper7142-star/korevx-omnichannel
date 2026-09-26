import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { TicketsService, CreateTicketDto } from './tickets.service';
import { TicketType, TicketCategory, TicketStatus, TicketPriority, UserRole } from '@prisma/client';

@ApiTags('Tickets & Incidents (Governance)')
@Controller('api/v1/tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear nuevo ticket de escalamiento interno (Operador -> Admin o Admin -> Super Admin)' })
  async createTicket(
    @Req() req: Request,
    @Body()
    body: {
      creatorUserId: string;
      type: TicketType;
      category: TicketCategory;
      priority?: TicketPriority;
      title: string;
      description: string;
      conversationId?: string;
      assignedToId?: string;
      supportModeRequested?: boolean;
    },
  ) {
    const rawIp = req.headers['x-forwarded-for'] as string;
    const ipAddress = rawIp ? rawIp.split(',')[0].trim() : req.socket.remoteAddress || '127.0.0.1';
    const userAgent = (req.headers['user-agent'] as string) || 'KorevX API Client';

    return this.ticketsService.createTicket(
      {
        type: body.type,
        category: body.category,
        priority: body.priority,
        title: body.title,
        description: body.description,
        conversationId: body.conversationId,
        assignedToId: body.assignedToId,
        supportModeRequested: body.supportModeRequested,
      },
      body.creatorUserId,
      ipAddress,
      userAgent,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Consultar tickets con filtros por tipo, categoría, estado y empresa' })
  async getTickets(
    @Query('workspaceId') workspaceId?: string,
    @Query('type') type?: TicketType,
    @Query('category') category?: TicketCategory,
    @Query('status') status?: TicketStatus,
    @Query('priority') priority?: TicketPriority,
    @Query('createdById') createdById?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ticketsService.getTickets({
      workspaceId,
      type,
      category,
      status,
      priority,
      createdById,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Actualizar estado de un ticket y registrar notas de resolución' })
  async updateStatus(
    @Req() req: Request,
    @Param('id') id: string,
    @Body()
    body: {
      status: TicketStatus;
      resolutionNotes?: string;
      userId?: string;
    },
  ) {
    const rawIp = req.headers['x-forwarded-for'] as string;
    const ipAddress = rawIp ? rawIp.split(',')[0].trim() : req.socket.remoteAddress || '127.0.0.1';
    const userAgent = (req.headers['user-agent'] as string) || 'KorevX API Client';

    return this.ticketsService.updateTicketStatus(
      id,
      body.status,
      body.resolutionNotes,
      body.userId,
      ipAddress,
      userAgent,
    );
  }

  @Post(':id/support-mode')
  @ApiOperation({ summary: 'Autorizar o revocar el Modo Soporte Técnico para el Super Admin' })
  async toggleSupportMode(
    @Param('id') id: string,
    @Body() body: { granted: boolean; userId: string },
  ) {
    return this.ticketsService.toggleSupportMode(id, body.granted, body.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancelar o eliminar un ticket' })
  async deleteTicket(@Param('id') id: string) {
    return this.ticketsService.deleteTicket(id);
  }
}
