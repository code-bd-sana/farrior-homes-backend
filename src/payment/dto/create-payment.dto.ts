import {
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreatePaymentDto {
  @IsMongoId({ message: 'User id must be a valid Mongo id' })
  @IsNotEmpty({ message: 'User id is required' })
  userId: string;

  @IsOptional()
  @IsString({ message: 'Success URL must be a string' })
  successUrl?: string;

  @IsOptional()
  @IsString({ message: 'Cancel URL must be a string' })
  cancelUrl?: string;
}
