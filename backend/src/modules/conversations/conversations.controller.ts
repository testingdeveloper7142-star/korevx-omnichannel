import { Controller, Get, Post, Patch, Param, Body, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { ConversationsService } from './conversations.service';
import { ConversationStatus, PlatformType, InteractionType } from '@prisma/client';

@ApiTags('Conversations')
@Controller('api/v1/conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar conversaciones con filtros avanzados' })
  async getConversations(
    @Query('workspaceId') workspaceId?: string,
    @Query('status') status?: ConversationStatus,
    @Query('platform') platform?: PlatformType,
    @Query('interactionType') interactionType?: InteractionType,
    @Query('assignedUserId') assignedUserId?: string,
    @Query('search') search?: string,
  ) {
    return this.conversationsService.getConversations({
      workspaceId,
      status,
      platform,
      interactionType,
      assignedUserId,
      search,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener hilo completo de una conversación' })
  async getConversationById(@Param('id') id: string) {
    return this.conversationsService.getConversationById(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Actualizar estado de conversación (PENDING, ASSIGNED, RESOLVED)' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: { status: ConversationStatus; assignedUserId?: string; performedById?: string },
    @Req() req: Request,
  ) {
    const rawIp = req.headers['x-forwarded-for'] as string;
    const ipAddress = rawIp ? rawIp.split(',')[0].trim() : req.socket.remoteAddress || '127.0.0.1';
    const userAgent = (req.headers['user-agent'] as string) || 'KorevX Web Client';
    return this.conversationsService.updateConversationStatus(
      id,
      dto.status,
      dto.assignedUserId,
      dto.performedById,
      ipAddress,
      userAgent,
    );
  }

  @Post(':id/reply')
  @ApiOperation({ summary: 'Responder a una conversación o comentario' })
  async reply(
    @Param('id') id: string,
    @Body()
    dto: {
      agentUserId?: string;
      content: string;
      mediaUrls?: string[];
      parentCommentId?: string;
    },
  ) {
    return this.conversationsService.replyToConversation(
      id,
      dto.agentUserId || 'system-agent',
      dto.content,
      dto.mediaUrls,
      dto.parentCommentId,
    );
  }

  @Patch(':id/contact')
  @ApiOperation({ summary: 'Actualizar nombre de contacto de la conversación' })
  async updateContact(
    @Param('id') id: string,
    @Body() dto: { name: string },
  ) {
    return this.conversationsService.updateConversationContact(id, dto.name);
  }
}
