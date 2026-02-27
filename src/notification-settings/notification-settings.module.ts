import { Module } from '@nestjs/common';
import { NotificationSettingsService } from './notification-settings.service';
import { NotificationSettingsController } from './notification-settings.controller';
import { MongooseModule } from '@nestjs/mongoose';
import {
  NotificationSettings,
  NotificationSettingSchema,
} from 'src/schemas/notification.settngs.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: NotificationSettings.name,
        schema: NotificationSettingSchema,
      },
    ]),
  ],
  controllers: [NotificationSettingsController],
  providers: [NotificationSettingsService],
})
export class NotificationSettingsModule {}
