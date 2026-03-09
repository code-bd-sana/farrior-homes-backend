import { Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import type { AuthUser } from 'src/common/interface/auth-user.interface';
import { UserRole } from 'src/schemas/user.schema';
import { SavePropertyService } from './save-property.service';

@Controller('save-property')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.USER)
export class SavePropertyController {
  constructor(private readonly savePropertyService: SavePropertyService) {}

  @Post(':propertyId')
  create(
    @CurrentUser() user: AuthUser,
    @Param('propertyId') propertyId: string,
  ) {
    return this.savePropertyService.create(user, propertyId);
  }

  @Get('me')
  findMine(@CurrentUser() user: AuthUser, @Query() query: Record<string, any>) {
    return this.savePropertyService.findMine(user, query);
  }

  @Get('check/:propertyId')
  checkSaved(
    @CurrentUser() user: AuthUser,
    @Param('propertyId') propertyId: string,
  ) {
    return this.savePropertyService.checkSaved(user, propertyId);
  }

  @Delete(':propertyId')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('propertyId') propertyId: string,
  ) {
    return this.savePropertyService.remove(user, propertyId);
  }
}
