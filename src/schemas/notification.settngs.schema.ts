import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { NotificationType } from './notification.schema';

export enum NotificationSettingsTitle {
  ALERT = 'New Listing Alerts',
}
@Schema({ timestamps: true })
export class NotificationSettings {
  @Prop({ required: true, unique: true })
  name: NotificationType;
  @Prop({ required: true, unique: true })
  title: string;
  @Prop({ required: true })
  isActive: boolean;
  @Prop({ required: true })
  description: string;
}
export const NotificationSettingSchema =
  SchemaFactory.createForClass(NotificationSettings);
