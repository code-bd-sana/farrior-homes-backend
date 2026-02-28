import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {  Model, QueryFilter } from 'mongoose';
import { AuthUser } from 'src/common/interface/auth-user.interface';
import { UserRole } from 'src/schemas/user.schema';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { Property } from 'src/schemas/property.schema';


// doc
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
  findAll(userOrQuery, queryOrUser) {
    // The controller may pass args in either order, so normalize them first.
    const isLikelyUser = (value: any): value is AuthUser =>
      Boolean(value && typeof value === 'object' && ('role' in value || 'userId' in value));

    const user = isLikelyUser(userOrQuery) ? userOrQuery : queryOrUser;
    const query = isLikelyUser(userOrQuery) ? queryOrUser : userOrQuery;

    // Build Mongo filters only from valid query values.
    const filters: QueryFilter<Property> = {};
    const parseNum = (value: unknown): number | null => {
      if (value === undefined || value === null || value === '') return null;
      const num = Number(value);
      return Number.isFinite(num) ? num : null;
    };
    const escapeRegex = (value: string) =>
      value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const minPrice = parseNum(query?.minPrice);
    const maxPrice = parseNum(query?.maxPrice);
    if (minPrice !== null || maxPrice !== null) {
      filters.price = {};
      if (minPrice !== null) filters.price.$gte = minPrice;
      if (maxPrice !== null) filters.price.$lte = maxPrice;
    }

    const squareFeet = parseNum(query?.squareFeet);
    if (squareFeet !== null) filters.squareFeet = squareFeet;

    const bedrooms = parseNum(query?.bedrooms);
    if (bedrooms !== null) filters.bedrooms = bedrooms;

    const bathrooms = parseNum(query?.bathrooms);
    if (bathrooms !== null) filters.bathrooms = bathrooms;

    const locationToken =
      query?.locationId ?? query?.location ?? query?.placeId ?? query?.locationIdentifier;
    if (locationToken) {
      filters.locationMapLink = {
        $regex: escapeRegex(String(locationToken)),
        $options: 'i',
      };
    }

    if (!user?.role || user.role !== UserRole.ADMIN) {
      filters.isPosted = true;
    }

    return this.propertyModel.find(filters);
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
