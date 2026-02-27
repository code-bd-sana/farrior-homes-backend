import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from 'src/schemas/user.schema';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { LoginAuthDto } from './dto/login-auth.dto';
import { JwtService } from '@nestjs/jwt';
import { UserIdDto } from 'src/common/dto/mongoId.dto';

@Injectable()
export class AuthService {
  /**
   * AuthService handles registration, authentication and password flows.
   *
   * It uses Mongoose for database interactions and JWT for token generation.
   *
   * @param userModel Mongoose model for User schema
   * @param jwtService Service for generating JWT tokens
   */
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Register a new user with the provided details.
   *
   * @param createAuthDto data - registration data including email, password, etc.
   * @returns a success message on completion
   */
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

  /**
   *
   * @param loginAuthDto data - login data including email and password
   * @returns a success message, access token and user data on successful authentication, or throws an error if authentication fails
   */
  async login(loginAuthDto: LoginAuthDto) {
    const { email, password } = loginAuthDto;

    const user = await this.userModel.findOne({ email }).lean();

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatched = await bcrypt.compare(password, user.password);
    if (!passwordMatched) {
      throw new UnauthorizedException('Password does not match');
    }

    // create JWT token with user id, email and role as payload
    const payload = {
      sub: String(user._id),
      email: user.email,
      role: user.role,
    };

    // sign the payload to create JWT token
    const accessToken = await this.jwtService.signAsync(payload);

    // remove password field from user object before returning
    delete user.password;

    // return success message, access token and user data in the response
    return {
      message: 'Login successful',
      data: {
        accessToken,
        user,
      },
    };
  }

  /**
   *
   * @returns a list of all users with their details, excluding passwords, along with a success message. Throws an error if fetching users fails.
   *
   * This is for admin use to view all registered users in the system.
   */
  async findAllUsers() {
    const users = await this.userModel.find().lean();

    return {
      message: 'Users fetched successfully',
      data: users.map((user) => this.sanitizeUser(user)),
    };
  }

  /**
   *
   * @param userId - the id of the user whose profile is to be fetched
   * @returns the profile details of the user with the given id, excluding the password, along with a success message. Throws an error if the user is not found or if the provided id is invalid.
   *
   * This allows authenticated users to view their own profile information.
   */
  async getUserProfile(userId: UserIdDto['userId']) {
    this.ensureValidObjectId(userId);

    const user = await this.userModel.findById(userId).lean();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      message: 'Profile fetched successfully',
      data: this.sanitizeUser(user),
    };
  }

  /**
   *
   * @param userId - the id of the user whose profile is to be updated
   * @param updateAuthDto - the data to update the user's profile with
   * @returns the updated profile details of the user, excluding the password, along with a success message. Throws an error if the user is not found or if the provided id is invalid.
   *
   * This allows authenticated users to update their own profile information. Admins can also use this to update any user's profile.
   */
  async updateMyProfile(
    userId: UserIdDto['userId'],
    updateAuthDto: UpdateAuthDto,
  ) {
    this.ensureValidObjectId(userId);

    const updatedUser = await this.userModel
      .findByIdAndUpdate(userId, updateAuthDto, {
        new: true,
        runValidators: true,
      })
      .lean();

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return {
      message: 'Profile updated successfully',
      data: this.sanitizeUser(updatedUser),
    };
  }

  /**
   *
   * @param userId - the id of the user to be deleted
   * @returns a success message on successful deletion of the user. Throws an error if the user is not found or if the provided id is invalid.
   *
   * This allows admins to delete any user from the system. Regular users cannot delete their own accounts or other users' accounts.
   */
  async removeUserByAdmin(userId: UserIdDto['userId']) {
    this.ensureValidObjectId(userId);

    const deletedUser = await this.userModel.findByIdAndDelete(userId).lean();
    if (!deletedUser) {
      throw new NotFoundException('User not found');
    }

    return {
      message: 'User deleted successfully',
      data: this.sanitizeUser(deletedUser),
    };
  }

  // helper method to validate if a string is a valid MongoDB ObjectId
  private ensureValidObjectId(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user id');
    }
  }

  // helper method to remove password field from user objects before sending them in responses
  private sanitizeUser<T extends { password?: string }>(
    user: T,
  ): Omit<T, 'password'> {
    const sanitizedUser = { ...user };
    delete sanitizedUser.password;
    return sanitizedUser;
  }
}
