import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { Property } from './entities/property.entity';

@Injectable()
export class PropertyService {
  constructor(
    @InjectModel(Property.name)
    private readonly propertyModel: Model<Property>,
  ) {}

  // Create a new property
  async create(createPropertyDto: CreatePropertyDto): Promise<Property> {
    const createdProperty = new this.propertyModel(createPropertyDto);
    return createdProperty.save();
  }

  // Find All Property
  findAll(limit = 10, skip = 0, searchQuery = {}) {
    const property = this.propertyModel
      .find(searchQuery)
      .limit(limit)
      .skip(skip);
    return property;
  }

  // Find single property using id

  findOne(id: string) {
    const property = this.propertyModel.findOne({ _id: id });
    return property;
  }

  update(id: string, updatePropertyDto: UpdatePropertyDto) {
    const updated = this.propertyModel.updateOne(
      { _id: id },
      {
        $set: updatePropertyDto,
      },
    );
    return updated;
  }

  remove(id: number) {
    return `This action removes a #${id} property`;
  }
}
