import { Controller, Get, Patch, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ChannelsService } from './channels.service';

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

  @Patch(':id/token')
  @ApiOperation({ summary: 'Actualizar token de acceso del canal' })
  async updateChannelToken(@Param('id') id: string, @Body() dto: { accessToken: string }) {
    return this.channelsService.updateChannelToken(id, dto.accessToken);
  }
}
