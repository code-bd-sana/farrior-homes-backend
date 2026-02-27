import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { NotificationType } from './notification.schema';

@Schema({ timestamps: true })
export class NotificationSettings {
  @Prop({ required: true })
  name: NotificationType;

  @Prop({ required: true })
  status: boolean;
}
export const NotificationSettingSchema =
  SchemaFactory.createForClass(NotificationSettings);
