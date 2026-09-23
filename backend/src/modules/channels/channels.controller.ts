import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ChannelsService } from './channels.service';

@ApiTags('Channels')
@Controller('api/v1/channels')
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas las cuentas de redes sociales vinculadas' })
  @ApiResponse({ status: 200, description: 'Lista de canales' })
  async getChannels(@Query('workspaceId') workspaceId: string) {
    // Si no se envía workspaceId en desarrollo, obtenemos o usamos el default
    return this.channelsService.listChannels(workspaceId || 'default-workspace');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener información detallada de un canal' })
  async getChannel(@Param('id') id: string) {
    return this.channelsService.getChannelById(id);
  }
}
