import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ChannelsService } from './channels.service';
import { PlatformType } from '@prisma/client';

@ApiTags('Channels')
@Controller('api/v1/channels')
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas las cuentas de redes sociales vinculadas' })
  @ApiResponse({ status: 200, description: 'Lista de canales' })
  async getChannels(@Query('workspaceId') workspaceId?: string) {
    return this.channelsService.listChannels(workspaceId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener información detallada de un canal' })
  async getChannel(@Param('id') id: string) {
    return this.channelsService.getChannelById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Vincular nueva cuenta de red social' })
  async createChannel(
    @Body()
    body: {
      workspaceId: string;
      platform: PlatformType;
      accountName: string;
      accountHandle?: string;
    },
  ) {
    return this.channelsService.createChannel(body);
  }

  @Patch(':id/token')
  @ApiOperation({ summary: 'Actualizar token de acceso del canal' })
  async updateChannelToken(@Param('id') id: string, @Body() dto: { accessToken: string }) {
    return this.channelsService.updateChannelToken(id, dto.accessToken);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desconectar o eliminar un canal' })
  async deleteChannel(@Param('id') id: string) {
    return this.channelsService.deleteChannel(id);
  }
}
