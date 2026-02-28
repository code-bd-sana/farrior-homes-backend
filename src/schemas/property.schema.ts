import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export enum PropertyStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  BAN = 'ban',
}

@Schema({ timestamps: true })
export class Property {
  @Prop({ required: true, trim: true })
  propertyName: string;

  @Prop({
    required: true,
    enum: PropertyStatus,
    default: PropertyStatus.PENDING,
  })
  status: PropertyStatus;

  @Prop({ required: true, type: String })
  overview: string;

  @Prop({ required: true, type: String })
  keyFeatures: string;

  @Prop({ required: true, type: Number, min: 0 })
  bedrooms: number;

  @Prop({ required: true, type: Number, min: 0 })
  bathrooms: number;

  @Prop({ required: true, type: Number, min: 0 })
  squareFeet: number;

  @Prop({ required: true, type: Number, min: 0 })
  lotSize: number;

  @Prop({ required: true, type: Number, min: 0 })
  price: number;

  @Prop({ required: true, type: Number })
  yearBuilt: number;

  @Prop({ required: true, type: String })
  moreDetails: string;

  @Prop({ type: [String], default: [] })
  photos: string[];

  @Prop({ type: String, default: '' })
  locationMapLink: string;

  @Prop({ type: Boolean, default: '' })
  isPosted:boolean

  @Prop({type:String, required:false})
   sellPostingDate:string
   
   @Prop({type:String, required:false})
   sellPostingTime: string

  // @Prop({ type: Types.ObjectId, required: true })
  // propertyOwner: Types.ObjectId;
}

export type PropertyDocument = HydratedDocument<Property>;
export const PropertySchema = SchemaFactory.createForClass(Property);
