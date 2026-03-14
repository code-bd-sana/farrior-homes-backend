import { Module } from '@nestjs/common';
import { UserNotificationSettingsService } from './user-notification-settings.service';
import { UserNotificationSettingsController } from './user-notification-settings.controller';

@Module({
  controllers: [UserNotificationSettingsController],
  providers: [UserNotificationSettingsService],
})
export class UserNotificationSettingsModule {}
