import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuditModule } from './modules/audit/audit.module';
import { EventsModule } from './modules/websockets/events.module';
import { ChannelsModule } from './modules/channels/channels.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { EnterprisesModule } from './modules/enterprises/enterprises.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    AuditModule,
    EventsModule,
    ChannelsModule,
    WebhooksModule,
    ConversationsModule,
    TicketsModule,
    EnterprisesModule,
  ],
})
export class AppModule {}
