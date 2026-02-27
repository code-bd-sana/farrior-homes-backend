import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true, versionKey: false })
export class User {
  @Prop({ trim: true })
  // can upload image as file or provide image url
  profileImage?: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  email: string;

  @Prop({ required: true, unique: true, trim: true })
  phone: string;

  @Prop({ required: true, trim: true })
  homeAddress: string;

  @Prop({ required: true, trim: true })
  officeAddress: string;

  @Prop({ required: false })
  password?: string;

  @Prop({ trim: true })
  websiteLink?: string;

  @Prop({ trim: true })
  facebookLink?: string;

  @Prop({ trim: true })
  instagramLink?: string;

  @Prop({ trim: true })
  twitterLink?: string;

  @Prop({ trim: true })
  linkedinLink?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
