import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('api/v1')
export class AppController {
  @Get('health')
  @ApiOperation({ summary: 'Endpoint de salud y pre-calentamiento del backend' })
  getHealth() {
    return {
      status: 'ok',
      service: 'KorevX Omnichannel Backend',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
