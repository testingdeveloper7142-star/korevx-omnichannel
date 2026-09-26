import { Controller, Post, Body, Req, Patch, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';

@ApiTags('Auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión directamente con correo y contraseña' })
  async login(
    @Req() req: Request,
    @Body() body: { email: string; password?: string },
  ) {
    const rawIp = req.headers['x-forwarded-for'] as string;
    const ipAddress = rawIp ? rawIp.split(',')[0].trim() : req.socket.remoteAddress || '127.0.0.1';
    const userAgent = (req.headers['user-agent'] as string) || 'KorevX Client';

    return this.authService.login(body.email, body.password, ipAddress, userAgent);
  }

  @Post('change-password')
  @ApiOperation({ summary: 'Cambiar contraseña obligatoria' })
  async changePassword(
    @Req() req: Request,
    @Body() body: { userId: string; newPassword: string },
  ) {
    const rawIp = req.headers['x-forwarded-for'] as string;
    const ipAddress = rawIp ? rawIp.split(',')[0].trim() : req.socket.remoteAddress || '127.0.0.1';
    const userAgent = (req.headers['user-agent'] as string) || 'KorevX Client';

    return this.authService.changePassword(body.userId, body.newPassword, ipAddress, userAgent);
  }

  @Patch('reset-password/:userId')
  @ApiOperation({ summary: 'Restablecer contraseña a 123456789 por Administrador o Super Admin' })
  async resetPassword(
    @Req() req: Request,
    @Param('userId') userId: string,
    @Body() body: { requesterId?: string },
  ) {
    const rawIp = req.headers['x-forwarded-for'] as string;
    const ipAddress = rawIp ? rawIp.split(',')[0].trim() : req.socket.remoteAddress || '127.0.0.1';
    const userAgent = (req.headers['user-agent'] as string) || 'KorevX Client';

    return this.authService.resetPasswordToDefault(userId, body.requesterId, ipAddress, userAgent);
  }
}
