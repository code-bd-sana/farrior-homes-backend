import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PropertyService } from './property.service';
import { PropertyController } from './property.controller';
import { Property, PropertySchema } from 'src/schemas/property.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Property.name, schema: PropertySchema }])],
  controllers: [PropertyController],
  providers: [PropertyService],
})
export class PropertyModule {}
