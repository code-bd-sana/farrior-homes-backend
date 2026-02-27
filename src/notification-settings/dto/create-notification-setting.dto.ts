import { IsBoolean, IsEnum } from 'class-validator';
import { NotificationType } from 'src/schemas/notification.schema';

export class CreateNotificationSettingDto {
  @IsEnum(NotificationType, {
    message: `Name must be one of: ${Object.values(NotificationType).join(', ')}`,
  })
  name: NotificationType;

  @IsBoolean({ message: 'IsActive Must be boolean' })
  isActive: boolean;
}
