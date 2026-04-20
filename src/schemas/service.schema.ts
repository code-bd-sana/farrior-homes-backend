import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ServiceDocument = HydratedDocument<Service>;

// Main schema for the Service collection
@Schema({ timestamps: true, versionKey: false })
export class Service {
  @Prop({ required: true, trim: true, index: true })
  category!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, trim: true })
  description!: string;

  @Prop({ type: [String], default: [] })
  points!: string[];

  @Prop({ required: true, default: false })
  isPremiumIncluded!: boolean;
}

export const ServiceSchema = SchemaFactory.createForClass(Service);
