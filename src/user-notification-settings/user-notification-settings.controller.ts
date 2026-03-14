import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { UserNotificationSettingsService } from './user-notification-settings.service';
import { CreateUserNotificationSettingDto } from './dto/create-user-notification-setting.dto';
import { UpdateUserNotificationSettingDto } from './dto/update-user-notification-setting.dto';

@Controller('user-notification-settings')
export class UserNotificationSettingsController {
  constructor(private readonly userNotificationSettingsService: UserNotificationSettingsService) {}

  @Post()
  create(@Body() createUserNotificationSettingDto: CreateUserNotificationSettingDto) {
    return this.userNotificationSettingsService.create(createUserNotificationSettingDto);
  }

  @Get()
  findAll() {
    return this.userNotificationSettingsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userNotificationSettingsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserNotificationSettingDto: UpdateUserNotificationSettingDto) {
    return this.userNotificationSettingsService.update(+id, updateUserNotificationSettingDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userNotificationSettingsService.remove(+id);
  }
}
