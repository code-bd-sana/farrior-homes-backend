import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

// DTO for creating a new service, which includes validation rules for the service properties
export class CreateServiceDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @Type(() => String)
  @IsString({ message: 'Category must be a string' })
  @IsNotEmpty({ message: 'Category is required' })
  category!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @Type(() => String)
  @IsString({ message: 'Service name must be a string' })
  @IsNotEmpty({ message: 'Service name is required' })
  name!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @Type(() => String)
  @IsString({ message: 'Description must be a string' })
  @IsNotEmpty({ message: 'Description is required' })
  description!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @Type(() => String)
  @IsString({ message: 'Price must be a string' })
  @IsNotEmpty({ message: 'Price is required' })
  price!: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.toLowerCase() === 'true';
    return value;
  })
  @IsBoolean({ message: 'isPremiumIncluded must be a boolean' })
  isPremiumIncluded?: boolean = false;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Order must be an integer' })
  @Min(1, { message: 'Order must be at least 1' })
  order?: number = 1;
}
