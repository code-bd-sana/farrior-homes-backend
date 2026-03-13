import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Types } from "mongoose";

@Schema({ timestamps: true })
export class UserNotificationSettings {

  @Prop({ type: Types.ObjectId, ref: "Notification", required: true })
  notification!: Types.ObjectId;

  @Prop({ required: true, default: true })
  isActive!: boolean;

}

export const UserNotificationSettingSchema =
  SchemaFactory.createForClass(UserNotificationSettings);