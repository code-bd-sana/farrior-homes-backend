import {
  Req,
  Query,
  UseGuards,
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { UserRole } from 'src/schemas/user.schema';
import { CurrentUser } from './decorators/current-user.decorator';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { MongoIdDto, UserIdDto } from 'src/common/dto/mongoId.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Register User
  @Post('register')
  create(@Body() createAuthDto: CreateAuthDto) {
    return this.authService.create(createAuthDto);
  }

  // Login User
  @Post('login')
  login(@Body() loginAuthDto: LoginAuthDto) {
    return this.authService.login(loginAuthDto);
  }

  // User Login with Google
  @UseGuards(GoogleAuthGuard)
  @Get('google')
  googleLogin() {
    return;
  }

  // Google OAuth callback endpoint
  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  googleCallback(@Req() req: Request & { user: unknown }) {
    return req.user;
  }

  // Get current user's profile
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMyProfile(@CurrentUser() user: UserIdDto) {
    return this.authService.getUserProfile(user.userId);
  }

  // Update current user's profile
  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateMyProfile(
    @CurrentUser() user: UserIdDto,
    @Body() updateAuthDto: UpdateAuthDto,
  ) {
    return this.authService.updateMyProfile(user.userId, updateAuthDto);
  }

  // Admin-only endpoint to get all users with pagination
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('users')
  findAllUsers(@Query() query: PaginationDto) {
    return this.authService.findAllUsers(query);
  }

  // Admin-only endpoint to delete a user by ID
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete('users/:id')
  removeUserByAdmin(@Param() param: MongoIdDto) {
    return this.authService.removeUserByAdmin(param.id);
  }

  // Admin-only endpoint to suspend/unsuspend a user by ID
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch('users/:id/suspend-toggle')
  suspendUserByAdmin(@Param() param: MongoIdDto) {
    return this.authService.suspendToggleByAdmin(param.id);
  }
}

// JwtAuthGuard: allow any logged-in user
// RolesGuard: Is this user allowed for this action?
