import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CreateNotificationSettingDto } from './dto/create-notification-setting.dto';
import { UpdateNotificationSettingDto } from './dto/update-notification-setting.dto';
import { NotificationSettingsService } from './notification-settings.service';

@Controller('notification-settings')
export class NotificationSettingsController {
  constructor(
    private readonly notificationSettingsService: NotificationSettingsService,
  ) {}

  @Get()
  findAll() {
    return this.notificationSettingsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.notificationSettingsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateNotificationSettingDto: UpdateNotificationSettingDto,
  ) {
    return this.notificationSettingsService.update(
      id,
      updateNotificationSettingDto,
    );
  }
}
