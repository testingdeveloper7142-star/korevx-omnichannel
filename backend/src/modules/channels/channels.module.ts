import { Module } from '@nestjs/common';
import { ChannelsService } from './channels.service';
import { ChannelsController } from './channels.controller';
import { FacebookAdapter } from './adapters/facebook.adapter';
import { InstagramAdapter } from './adapters/instagram.adapter';
import { TikTokAdapter } from './adapters/tiktok.adapter';

@Module({
  controllers: [ChannelsController],
  providers: [
    ChannelsService,
    FacebookAdapter,
    InstagramAdapter,
    TikTokAdapter,
  ],
  exports: [ChannelsService],
})
export class ChannelsModule {}
