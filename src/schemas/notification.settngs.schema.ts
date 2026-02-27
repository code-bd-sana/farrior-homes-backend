import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { NotificationType } from './notification.schema';

@Schema({ timestamps: true })
export class NotificationSettings {
  @Prop({ required: true, unique: true })
  name: NotificationType;

  @Prop({ required: true })
  isActive: boolean;
}
export const NotificationSettingSchema =
  SchemaFactory.createForClass(NotificationSettings);
