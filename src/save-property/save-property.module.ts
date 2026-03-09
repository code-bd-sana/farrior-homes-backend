import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AwsService } from 'src/common/aws/aws.service';
import { Property, PropertySchema } from 'src/schemas/property.schema';
import {
  SaveProperty,
  SavePropertySchema,
} from 'src/schemas/save-property.schema';
import { SavePropertyController } from './save-property.controller';
import { SavePropertyService } from './save-property.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SaveProperty.name, schema: SavePropertySchema },
      { name: Property.name, schema: PropertySchema },
    ]),
  ],
  controllers: [SavePropertyController],
  providers: [SavePropertyService, AwsService],
})
export class SavePropertyModule {}
