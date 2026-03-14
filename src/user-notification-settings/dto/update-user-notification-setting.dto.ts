import { PartialType } from '@nestjs/mapped-types';
import { CreateUserNotificationSettingDto } from './create-user-notification-setting.dto';

export class UpdateUserNotificationSettingDto extends PartialType(CreateUserNotificationSettingDto) {}
