import { Prop, Schema } from '@nestjs/mongoose';
import { IsNotEmpty, IsOptional } from 'class-validator';
import { Types } from 'mongoose';

export enum NotificationType {
  //
  ALERT = 'ALERT',
  REMINDER = 'REMINDER',
  ACTIVITY = 'ACTIVITY',
  LIVE = 'LIVE',
  MARKET = 'MARKET',
  DOCUMENT_REMINDERS = 'DOCUMENT_REMINDERS',
  USER_REPORT = 'USER_REPORT',
  MODERATION = 'MODERATION',
}

@Schema({ timestamps: true })
export class Notification {
  @Prop({ required: true })
  receiver: Types.ObjectId;

  @IsOptional()
  @Prop({ required: false })
  sender: Types.ObjectId;

  @IsNotEmpty()
  @Prop({ required: true })
  message: string;

  @Prop({ enum: NotificationType })
  type: NotificationType;
}
