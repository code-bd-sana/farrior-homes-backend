import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Min
} from 'class-validator';
import { PropertyStatus } from 'src/schemas/property.schema';

export class CreatePropertyDto {
  @IsString({ message: 'Property name is required' })
  propertyName: string;

  @IsEnum(PropertyStatus, {
    message: 'Status must be pending, active or ban',
  })
  status: PropertyStatus;

  @IsString({ message: 'Overview is required' })
  overview: string; // React Quill HTML

  @IsString({ message: 'Key features are required' })
  keyFeatures: string; // React Quill HTML

  @IsNumber({}, { message: 'Bedrooms must be a number' })
  @Min(0)
  bedrooms: number;

  @IsNumber({}, { message: 'Bathrooms must be a number' })
  @Min(0)
  bathrooms: number;

  @IsNumber({}, { message: 'Square feet must be a number' })
  @Min(0)
  squareFeet: number;

  @IsNumber({}, { message: 'Lot size must be a number' })
  @Min(0)
  lotSize: number;

  @IsNumber({}, { message: 'Price must be a number' })
  @Min(0)
  price: number;

  @IsNumber({}, { message: 'Year built must be a number' })
  yearBuilt: number;

  @IsString({ message: 'More details are required' })
  moreDetails: string; // React Quill HTML


  @IsUrl({}, { message: 'Location map link must be a valid URL' })
  locationMapLink: string;

  @IsOptional()
  @IsBoolean({message:"IsPosted must be boolan"})
  IsPosted: boolean

  @IsOptional()
  @IsString({message:'Posting date must be string'})
  sellPostingDate:string

  @IsOptional()
  @IsString({message:'Posting Time must be string'})
  sellPostingTime:string

  @IsArray({message:"Images must be a array of string"})
  images:[]
}
