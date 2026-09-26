import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  TicketType,
  TicketCategory,
  TicketStatus,
  TicketPriority,
  AuditAction,
  AuditResource,
  UserRole,
} from '@prisma/client';

export interface CreateTicketDto {
  type: TicketType;
  category: TicketCategory;
  priority?: TicketPriority;
  title: string;
  description: string;
  conversationId?: string;
  assignedToId?: string;
  supportModeRequested?: boolean;
}

export interface GetTicketsFilter {
  workspaceId?: string;
  type?: TicketType;
  category?: TicketCategory;
  status?: TicketStatus;
  priority?: TicketPriority;
  createdById?: string;
  userRole?: UserRole;
  limit?: number;
}

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async createTicket(
    dto: CreateTicketDto,
    creatorUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const creator = await this.prisma.user.findUnique({
      where: { id: creatorUserId },
      include: { workspace: true },
    });

    if (!creator) {
      throw new NotFoundException(`Usuario creador ${creatorUserId} no existe`);
    }

    // Regla de negocio: Un agente solo puede crear tickets de tipo OPERATOR_TO_ADMIN
    if (creator.role === UserRole.AGENT && dto.type === TicketType.ADMIN_TO_SUPERADMIN) {
      throw new ForbiddenException('Los operadores solo pueden generar tickets dirigidos al Administrador de su empresa');
    }

    const ticket = await this.prisma.internalTicket.create({
      data: {
        workspaceId: creator.workspaceId,
        type: dto.type,
        category: dto.category,
        priority: dto.priority || TicketPriority.MEDIUM,
        status: TicketStatus.OPEN,
        title: dto.title,
        description: dto.description,
        createdById: creator.id,
        assignedToId: dto.assignedToId,
        conversationId: dto.conversationId,
        supportModeRequested: !!dto.supportModeRequested,
      },
      include: {
        createdBy: {
          select: { id: true, fullName: true, email: true, role: true },
        },
        assignedTo: {
          select: { id: true, fullName: true, email: true, role: true },
        },
        workspace: {
          select: { id: true, name: true, slug: true },
        },
        conversation: {
          select: {
            id: true,
            status: true,
            interactionType: true,
            contact: { select: { name: true } },
          },
        },
      },
    });

    // Registrar en auditoría inmutable
    await this.auditService.recordAudit({
      workspaceId: creator.workspaceId,
      userId: creator.id,
      action: AuditAction.CREATE,
      resource: AuditResource.TICKET,
      resourceId: ticket.id,
      description: `Ticket #${ticket.ticketNumber} (${ticket.type} - ${ticket.category}) creado por ${creator.fullName}: ${ticket.title}`,
      newState: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        type: ticket.type,
        category: ticket.category,
        priority: ticket.priority,
        status: ticket.status,
        title: ticket.title,
      },
      ipAddress,
      userAgent,
    });

    return ticket;
  }

  async getTickets(filters: GetTicketsFilter) {
    const where: any = {};

    if (filters.workspaceId) {
      where.workspaceId = filters.workspaceId;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.priority) {
      where.priority = filters.priority;
    }

    if (filters.createdById) {
      where.createdById = filters.createdById;
    }

    return this.prisma.internalTicket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters.limit || 50,
      include: {
        createdBy: {
          select: { id: true, fullName: true, email: true, role: true },
        },
        assignedTo: {
          select: { id: true, fullName: true, email: true, role: true },
        },
        workspace: {
          select: { id: true, name: true, slug: true },
        },
        conversation: {
          select: {
            id: true,
            status: true,
            interactionType: true,
            contact: { select: { name: true } },
          },
        },
      },
    });
  }

  async updateTicketStatus(
    id: string,
    status: TicketStatus,
    resolutionNotes?: string,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const ticket = await this.prisma.internalTicket.findUnique({
      where: { id },
      include: { workspace: true },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket ${id} no encontrado`);
    }

    const previousState = {
      status: ticket.status,
      resolutionNotes: ticket.resolutionNotes,
      resolvedAt: ticket.resolvedAt,
    };

    const isResolving = status === TicketStatus.RESOLVED;

    const dataToUpdate: any = {
      status,
      resolutionNotes: resolutionNotes || ticket.resolutionNotes,
      resolvedAt: isResolving ? new Date() : ticket.resolvedAt,
    };

    if (userId && status === TicketStatus.IN_REVIEW) {
      dataToUpdate.assignedToId = userId;
    }

    const updated = await this.prisma.internalTicket.update({
      where: { id },
      data: dataToUpdate,
      include: {
        createdBy: {
          select: { id: true, fullName: true, email: true, role: true },
        },
        assignedTo: {
          select: { id: true, fullName: true, email: true, role: true },
        },
      },
    });

    // Auditoría inmutable de actualización de ticket
    await this.auditService.recordAudit({
      workspaceId: ticket.workspaceId,
      userId,
      action: AuditAction.STATUS_CHANGE,
      resource: AuditResource.TICKET,
      resourceId: id,
      description: `Ticket #${ticket.ticketNumber} cambió de estado a ${status}`,
      previousState,
      newState: {
        status,
        resolutionNotes,
        resolvedAt: updated.resolvedAt,
      },
      ipAddress,
      userAgent,
    });

    return updated;
  }

  async toggleSupportMode(ticketId: string, granted: boolean, userId: string) {
    const ticket = await this.prisma.internalTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      throw new NotFoundException(`Ticket ${ticketId} no encontrado`);
    }

    const updated = await this.prisma.internalTicket.update({
      where: { id: ticketId },
      data: {
        supportModeGranted: granted,
      },
    });

    await this.auditService.recordAudit({
      workspaceId: ticket.workspaceId,
      userId,
      action: AuditAction.UPDATE,
      resource: AuditResource.TICKET,
      resourceId: ticketId,
      description: granted
        ? `Protocolo 'Modo Soporte Técnico' HABILITADO explícitamente para el Super Admin en el Ticket #${ticket.ticketNumber}`
        : `'Modo Soporte Técnico' REVOCADO para el Ticket #${ticket.ticketNumber}`,
      newState: { supportModeGranted: granted },
    });

    return updated;
  }

  async deleteTicket(ticketId: string) {
    try {
      const ticket = await this.prisma.internalTicket.findUnique({ where: { id: ticketId } });
      if (!ticket) return { success: true };

      await this.prisma.internalTicket.delete({ where: { id: ticketId } });
      return { success: true };
    } catch {
      return { success: true };
    }
  }
}
