import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('KorevXBootstrap');
  const app = await NestFactory.create(AppModule);

  // Habilitar CORS para integración fluida con Frontend Vite
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Validación de DTOs global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Documentación OpenAPI / Swagger
  const config = new DocumentBuilder()
    .setTitle('KorevX Omnichannel API')
    .setDescription('API centralizada de mensajería y comentarios omnicanal (Facebook, Instagram, TikTok)')
    .setVersion('1.0')
    .addTag('Webhooks', 'Ingestión y verificación de webhooks en vivo')
    .addTag('Conversations', 'Bandeja unificada, gestión de estados y respuestas')
    .addTag('Channels', 'Cuentas y plataformas conectadas')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`🚀 Servidor backend KorevX ejecutándose en: http://localhost:${port}`);
  logger.log(`📚 Documentación Swagger disponible en: http://localhost:${port}/api/docs`);
}

bootstrap();
