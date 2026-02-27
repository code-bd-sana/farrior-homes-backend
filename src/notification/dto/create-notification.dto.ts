import { IsMongoId, IsOptional, IsString } from 'class-validator';
import { UserIdDto } from 'src/common/dto/mongoId.dto';
import { NotificationType } from 'src/schemas/notification.schema';

export class CreateNotificationDto {
  @IsMongoId({ message: 'Receiver is Required' })
  receiver: UserIdDto['userId'];

  @IsOptional()
  @IsMongoId()
  sender: UserIdDto['userId'];

  @IsString({ message: 'Message is Required' })
  message: string;

  @IsString({ message: 'Notification Type is Required' })
  type: NotificationType;

  @IsOptional()
  @IsString()
  redirectLinik: string;
}
