import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class PaginationDto {
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot be greater than 100' })
  limit?: number = 10;

  @IsOptional()
  @IsString({ message: 'Search must be a string' })
  search?: string;
}

export class PaginatedMetaDto {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  count: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  search?: string;
}
