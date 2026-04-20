import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Service, ServiceDocument } from 'src/schemas/service.schema';
import { Model } from 'mongoose';
import { PaginatedMetaDto, PaginationDto } from 'src/common/dto/pagination.dto';
import { MongoIdDto } from 'src/common/dto/mongoId.dto';

const PREDEFINED_CATEGORY_ORDER = [
  'Full Service',
  'Investor & Unrepresented Seller Services',
  'Consultations',
  'Rental Services',
  'Residential BPO Services',
  'Commercial BPO Services',
  'Comparative Market Analysis',
] as const;

@Injectable()
export class ServiceService {
  constructor(
    @InjectModel(Service.name)
    private readonly serviceModel: Model<ServiceDocument>,
  ) {}

  /**
   * Create a new service
   *
   * @param createServiceDto - Data Transfer Object containing the details of the service to be created.
   * @returns The newly created service document from the database, which includes all the details of the service along with its unique identifier (_id) and timestamps (createdAt, updatedAt).
   * @throws BadRequestException if the provided data is invalid or fails validation checks defined in the CreateServiceDto class.
   * @throws InternalServerErrorException if there is an error while saving the service to the database.
   */
  async create(createServiceDto: CreateServiceDto) {
    const createdService = new this.serviceModel(
      this.normalizeServicePayload({
        ...createServiceDto,
        isPremiumIncluded: createServiceDto.isPremiumIncluded ?? false,
      }),
    );
    const savedService = await createdService.save();

    return {
      message: 'Service created successfully',
      data: savedService,
    };
  }

  /**
   * Fetch all services from the database.
   */
  async findAll(query: PaginationDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const search = query.search?.trim();

    const filter: Record<string, unknown> = search
      ? {
          $or: [
            { category: { $regex: search, $options: 'i' } },
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { points: { $regex: search, $options: 'i' } },
          ],
        }
      : {};

    const [matchedServices, total] = await Promise.all([
      this.serviceModel.find(filter).lean(),
      this.serviceModel.countDocuments(filter),
    ]);

    const sortedServices = this.sortServices(matchedServices);
    const start = (page - 1) * limit;
    const services = sortedServices.slice(start, start + limit);

    const totalPages = Math.ceil(total / limit) || 1;
    const pagination: PaginatedMetaDto = {
      page,
      limit,
      total,
      totalPages,
      count: services.length,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      ...(search ? { search } : {}),
    };

    return {
      message: 'Services fetched successfully',
      data: {
        services,
        pagination,
      },
    };
  }

  async findOne(id: MongoIdDto['id']) {
    const service = await this.serviceModel.findById(id);
    if (!service) {
      throw new NotFoundException('Service not found');
    }

    return {
      message: 'Service fetched successfully',
      data: service,
    };
  }

  async update(id: MongoIdDto['id'], updateServiceDto: UpdateServiceDto) {
    const updatePayload = this.normalizeServicePayload(updateServiceDto);

    const updatedService = await this.serviceModel.findByIdAndUpdate(
      id,
      updatePayload,
      {
        new: true,
        runValidators: true,
      },
    );

    if (!updatedService) {
      throw new NotFoundException('Service not found');
    }

    return {
      message: 'Service updated successfully',
      data: updatedService,
    };
  }

  async remove(id: MongoIdDto['id']) {
    const deletedService = await this.serviceModel.findByIdAndDelete(id);
    if (!deletedService) {
      throw new NotFoundException('Service not found');
    }

    return {
      message: 'Service deleted successfully',
      data: deletedService,
    };
  }

  private normalizeServicePayload(
    payload: Partial<CreateServiceDto | UpdateServiceDto>,
  ): Partial<CreateServiceDto> {
    const normalized: Partial<CreateServiceDto> = {};

    if (typeof payload.category === 'string') {
      normalized.category = payload.category.trim();
    }
    if (typeof payload.name === 'string') {
      normalized.name = payload.name.trim();
    }
    if (typeof payload.description === 'string') {
      normalized.description = payload.description.trim();
    }
    if (Array.isArray(payload.points)) {
      normalized.points = payload.points
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    }
    if (typeof payload.isPremiumIncluded === 'boolean') {
      normalized.isPremiumIncluded = payload.isPremiumIncluded;
    }

    return normalized;
  }

  private getCategoryRank(category: string): number {
    const index = PREDEFINED_CATEGORY_ORDER.findIndex(
      (item) => item.toLowerCase() === category.toLowerCase(),
    );

    return index === -1 ? PREDEFINED_CATEGORY_ORDER.length : index;
  }

  private sortServices<T extends { category?: string; name?: string }>(
    services: T[],
  ): T[] {
    return [...services].sort((a, b) => {
      const aCategory = (a.category ?? '').trim();
      const bCategory = (b.category ?? '').trim();

      const categoryRankDifference =
        this.getCategoryRank(aCategory) - this.getCategoryRank(bCategory);
      if (categoryRankDifference !== 0) {
        return categoryRankDifference;
      }

      const categoryNameDifference = aCategory.localeCompare(bCategory);
      if (categoryNameDifference !== 0) {
        return categoryNameDifference;
      }

      return (a.name ?? '').localeCompare(b.name ?? '');
    });
  }
}
