import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthUser } from 'src/common/interface/auth-user.interface';
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
  async create(createPropertyDto: CreatePropertyDto, user): Promise<Property> {

    // set property Owner 
    const payload = {
      ...createPropertyDto,
      propertyOwner: user.userId,
    };

    // create property
    const createdProperty = new this.propertyModel(payload);
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

  async findOne(id: string) {
    const property = await this.propertyModel.findOne({ _id: id });
    return property;
  }

  async update(id: string, updatePropertyDto: UpdatePropertyDto, user:AuthUser) {
    // TODO: If property owner dones not exist user.id then throw an error

    const updated = await this.propertyModel.updateOne(
      { _id: id },
      {
        $set: updatePropertyDto,
      },
    );
    return updated;
  }

  async remove(id: string) {
    const deleted = await this.propertyModel.deleteOne({ _id: id });
    return deleted;
  }
}
