import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
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
    @Body() dto: { status: ConversationStatus; assignedUserId?: string },
  ) {
    return this.conversationsService.updateConversationStatus(id, dto.status, dto.assignedUserId);
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
}
