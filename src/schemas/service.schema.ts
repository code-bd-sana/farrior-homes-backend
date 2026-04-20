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

  @Prop({ required: true, trim: true })
  price!: string;

  @Prop({ required: true, default: false })
  isPremiumIncluded!: boolean;

  @Prop({ required: true, default: 1, min: 1, index: true })
  order!: number;
}

export const ServiceSchema = SchemaFactory.createForClass(Service);
