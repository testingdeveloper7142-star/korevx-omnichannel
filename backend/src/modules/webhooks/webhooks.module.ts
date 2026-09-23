import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { ChannelsModule } from '../channels/channels.module';
import { FacebookAdapter } from '../channels/adapters/facebook.adapter';
import { InstagramAdapter } from '../channels/adapters/instagram.adapter';
import { TikTokAdapter } from '../channels/adapters/tiktok.adapter';

@Module({
  imports: [ChannelsModule],
  controllers: [WebhooksController],
  providers: [
    WebhooksService,
    FacebookAdapter,
    InstagramAdapter,
    TikTokAdapter,
  ],
  exports: [WebhooksService],
})
export class WebhooksModule {}
