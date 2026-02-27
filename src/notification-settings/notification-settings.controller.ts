import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { NotificationSettingsService } from './notification-settings.service';
import { CreateNotificationSettingDto } from './dto/create-notification-setting.dto';
import { UpdateNotificationSettingDto } from './dto/update-notification-setting.dto';

@Controller('notification-settings')
export class NotificationSettingsController {
  constructor(private readonly notificationSettingsService: NotificationSettingsService) {}

  @Post()
  create(@Body() createNotificationSettingDto: CreateNotificationSettingDto) {
    return this.notificationSettingsService.create(createNotificationSettingDto);
  }

  @Get()
  findAll() {
    return this.notificationSettingsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.notificationSettingsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateNotificationSettingDto: UpdateNotificationSettingDto) {
    return this.notificationSettingsService.update(+id, updateNotificationSettingDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.notificationSettingsService.remove(+id);
  }
}
