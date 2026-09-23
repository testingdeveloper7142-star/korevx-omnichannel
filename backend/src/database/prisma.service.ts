import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    this.logger.log('Conectando a base de datos PostgreSQL en Supabase...');
    try {
      await this.$connect();
      this.logger.log('✅ Conexión establecida exitosamente con Supabase PostgreSQL');
    } catch (err) {
      this.logger.error(`Error conectando a Prisma: ${err.message}`, err.stack);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
