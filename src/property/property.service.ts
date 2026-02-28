import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthUser } from 'src/common/interface/auth-user.interface';
import { Property } from 'src/schemas/property.schema';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { UserRole } from 'src/schemas/user.schema';



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
// Find All Property
findAll(user, query) {

  const filters: any = {};

  // convert string to number safely
  const toNumber = (value: any): number | null => {
    if (value === undefined || value === null || value === '') return null;
    const num = Number(value);
    return isNaN(num) ? null : num;
  };

  // convert single or comma string to number array
  const toNumberArray = (value: any): number[] => {
    if (!value) return [];

    if (Array.isArray(value)) {
      return value.map(Number).filter(n => !isNaN(n));
    }

    if (typeof value === 'string') {
      return value
        .split(',')
        .map(v => Number(v.trim()))
        .filter(n => !isNaN(n));
    }

    return [];
  };

  // price filter
  const minPrice = toNumber(query?.minPrice);
  const maxPrice = toNumber(query?.maxPrice);

  if (minPrice !== null || maxPrice !== null) {
    filters.price = {};

    if (minPrice !== null) {
      filters.price.$gte = minPrice;
    }

    if (maxPrice !== null) {
      filters.price.$lte = maxPrice;
    }
  }

  // square feet filter (single or multiple)
  const squareFeetArray = toNumberArray(query?.squareFeet);

  console.log(squareFeetArray, 'square feet');

  if (squareFeetArray.length === 1) {
    filters.squareFeet = squareFeetArray[0];
  }

  if (squareFeetArray.length > 1) {
    filters.squareFeet = { $in: squareFeetArray };
  }

  // bedrooms filter
  const bedroomArray = toNumberArray(query?.bedrooms);

  if (bedroomArray.length === 1) {
    filters.bedrooms = bedroomArray[0];
  }

  if (bedroomArray.length > 1) {
    filters.bedrooms = { $in: bedroomArray };
  }

  // bathrooms filter
  const bathroomArray = toNumberArray(query?.bathrooms);

  if (bathroomArray.length === 1) {
    filters.bathrooms = bathroomArray[0];
  }

  if (bathroomArray.length > 1) {
    filters.bathrooms = { $in: bathroomArray };
  }

  // property type filter (multi string)
  if (query?.type) {
    const types = Array.isArray(query.type)
      ? query.type
      : query.type.split(',');

    filters.propertyType = { $in: types };
  }

  // only show posted for non admin
  if (!user?.role || user.role !== UserRole.ADMIN) {
    filters.isPosted = true;
  }

  console.log(filters, 'final filters');

  return this.propertyModel.find(filters).lean();
}

  // *Find single property using id

  async findOne(id: string) {
    const property = await this.propertyModel.findOne({ _id: id });
    return property;
  }

  // * Update property
  async update(id: string, updatePropertyDto: UpdatePropertyDto, user: AuthUser) {
    const propertyExists = await this.propertyModel.exists({ _id: id });
    if (!propertyExists) {
      throw new NotFoundException('Property not found');
    }

    const isOwner = await this.propertyModel.findOne({
      _id: id,
      propertyOwner: user.userId,
    });
    if (!isOwner) {
      throw new ForbiddenException('Forbidden');
    }

    // updated
    const updated = await this.propertyModel.updateOne(
      { _id: id },
      {
        $set: updatePropertyDto,
      },
    );
    return updated;
  }


/// joy bangla testing 
// commit an dpush

  // *delete property
  async remove(id: string, user) {
    const isOwner = await this.propertyModel.exists({
      _id: id,
      propertyOwner: user.userId,
    });

  
    if (!isOwner) {
      throw new ForbiddenException('Forbidden');
    }

    const deleted = await this.propertyModel.deleteOne({ _id: id });
    return deleted;
  }
}
