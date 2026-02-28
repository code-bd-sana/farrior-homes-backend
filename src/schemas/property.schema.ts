import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export enum PropertyStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  BAN = 'ban',
}

@Schema({ timestamps: true })
export class Property {

  //Property Name
  @Prop({ required: true, trim: true })
  propertyName: string;

  // property status - by deafult active
  @Prop({
    required: true,
    enum: PropertyStatus,
    default: PropertyStatus.ACTIVE,
  })
  status: PropertyStatus;

  // overview  Receive Quil Js

  @Prop({ required: true, type: String })
  overview: string;

  // Key features: Receive Quil Js
  @Prop({ required: true, type: String })
  keyFeatures: string;

  // Bedrooms
  @Prop({ required: true, type: Number, min: 0 })
  bedrooms: number;

  //Bathrooms
  @Prop({ required: true, type: Number, min: 0 })
  bathrooms: number;

  // Square Feet
  @Prop({ required: true, type: Number, min: 0 })
  squareFeet: number;

  // Lot size
  @Prop({ required: true, type: Number, min: 0 })
  lotSize: number;

  //Price
  @Prop({ required: true, type: Number, min: 0 })
  price: number;


  //Year Built
  @Prop({ required: true, type: Number })
  yearBuilt: number;

  // More details: Receive Quil Js
  @Prop({ required: true, type: String })
  moreDetails: string;
  
// Location Map Link
  @Prop({ type: String, default: '' })
  locationMapLink: string;

  // Is Posted - By default false
  @Prop({ type: Boolean, default: false })
  isPosted:boolean

  // !Schdhedule 
  @Prop({type:String, required:false})
   sellPostingDate:string
   
   @Prop({type:String, required:false})
   sellPostingTime: string

   // Images : Receive Array of stirng
   // TODO: Waiting for aws
   @Prop({type:[String], required:true})
   images: string[]

  // @Prop({ type: Types.ObjectId, required: true })
  // propertyOwner: Types.ObjectId;
}

export type PropertyDocument = HydratedDocument<Property>;
export const PropertySchema = SchemaFactory.createForClass(Property);
