import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from 'src/schemas/user.schema';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async create(createAuthDto: CreateAuthDto) {
    const {
      confirmPassword,
      password,
      message: customMessage,
      ...rest
    } = createAuthDto;

    if (!password || !confirmPassword) {
      throw new BadRequestException(
        'Password and confirm password are required for normal registration',
      );
    }

    if (confirmPassword && !password) {
      throw new BadRequestException(
        'Password is required when confirm password is provided',
      );
    }

    if (password !== confirmPassword) {
      throw new BadRequestException('Confirm password must match password');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      const createdUser = await this.userModel.create({
        ...rest,
        password: hashedPassword,
      });

      // convert created user document to plain object
      const user = createdUser.toObject();
      // remove password field from user object before returning to client
      delete user.password;

      return {
        message: customMessage || 'User created successfully',
        data: user,
      };
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: number }).code === 11000
      ) {
        throw new ConflictException('Email or phone already exists');
      }

      throw error;
    }
  }

  findAll() {
    return `This action returns all auth`;
  }

  findOne(id: number) {
    return `This action returns a #${id} auth`;
  }

  update(id: number, updateAuthDto: UpdateAuthDto) {
    return `This action updates a #${id} auth`;
  }

  remove(id: number) {
    return `This action removes a #${id} auth`;
  }
}
