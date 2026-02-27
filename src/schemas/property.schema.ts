import { Prop, Schema } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum PropertyType {
  FOR_SALE = 'FOR_SALE',
  FOR_RENT = 'FOR_RENT',
}

export enum PropertyStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  BAN = 'ban',
}

@Schema({ timestamps: true })
export class Property extends Document {
  @Prop({ required: true })
  propertyName: string;

  @Prop({ required: true })
  address: string;

  @Prop({ required: true, enum: PropertyType })
  propertyType: PropertyType;

  @Prop({ required: true, enum: PropertyStatus })
  status: PropertyStatus;

  @Prop({ required: true, type: String })
  overview: string;

  @Prop({ required: true, type: String })
  keyFeatures: string;

  @Prop({ required: true, type: Number })
  bedrooms: number;

  @Prop({ required: true, type: Number })
  bathrooms: number;

  @Prop({ required: true, type: Number })
  squareFeet: number;

  @Prop({ required: true, type: Number })
  lotSize: number;

  @Prop({ required: true, type: Number })
  price: number;

  @Prop({ required: true, type: Number })
  yearBuilt: number;

  @Prop({ required: true, type: String })
  moreDetails: string;

  @Prop({ type: [String], default: [] })
  photos: string[];

  @Prop({ type: String, default: '' })
  locationMapLink: string;
}
