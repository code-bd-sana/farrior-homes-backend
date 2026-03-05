import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class DocumentItem {
  @Prop({ required: true })
  key: string; // s3 object key

  @Prop({ required: true })
  documentUrl: string;
}
export const DocumentItemSchema = SchemaFactory.createForClass(DocumentItem);

@Schema({ timestamps: true })
export class Document {
  @Prop({ required: true, ref: 'Property' })
  property: string;

  @Prop({
    type: DocumentItemSchema,
    required: true,
  })
  image: DocumentItem;
}
export const DocumentSchema = SchemaFactory.createForClass(Document);
