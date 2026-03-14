import { Injectable } from '@nestjs/common';
import { CreateUserNotificationSettingDto } from './dto/create-user-notification-setting.dto';
import { UpdateUserNotificationSettingDto } from './dto/update-user-notification-setting.dto';

@Injectable()
export class UserNotificationSettingsService {
  create(createUserNotificationSettingDto: CreateUserNotificationSettingDto) {
    return 'This action adds a new userNotificationSetting';
  }

  findAll() {
    return `This action returns all userNotificationSettings`;
  }

  findOne(id: number) {
    return `This action returns a #${id} userNotificationSetting`;
  }

  update(id: number, updateUserNotificationSettingDto: UpdateUserNotificationSettingDto) {
    return `This action updates a #${id} userNotificationSetting`;
  }

  remove(id: number) {
    return `This action removes a #${id} userNotificationSetting`;
  }
}
