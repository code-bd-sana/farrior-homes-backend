import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  Validate,
  ValidateIf,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'matchPassword', async: false })
class MatchPasswordConstraint implements ValidatorConstraintInterface {
  validate(confirmPassword: string, args: ValidationArguments) {
    const dto = args.object as CreateAuthDto;
    return dto.password === confirmPassword;
  }

  defaultMessage() {
    return 'Confirm password must match password';
  }
}

export class CreateAuthDto {
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty()
  name: string;

  @IsEmail({}, { message: 'Email must be a valid email address' })
  @IsNotEmpty()
  email: string;

  @IsString({ message: 'Phone must be a string' })
  @IsNotEmpty()
  phone: string;

  @IsString({ message: 'Home address must be a string' })
  @IsNotEmpty()
  homeAddress: string;

  @IsString({ message: 'Office address must be a string' })
  @IsNotEmpty()
  officeAddress: string;

  @IsOptional()
  @IsString({ message: 'Password must be a string' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password?: string;

  @IsString({ message: 'Confirm password must be a string' })
  @IsNotEmpty({
    message: 'Confirm password is required when password is provided',
  })
  @Validate(MatchPasswordConstraint)
  confirmPassword?: string;
}
