import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from 'src/auth/guards/optional-jwt-auth.guard';
import type { AuthUser } from 'src/common/interface/auth-user.interface';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { PropertyService } from './property.service';

@Controller('property')
export class PropertyController {
  constructor(private readonly propertyService: PropertyService) {}

  @UseGuards(JwtAuthGuard)
  // TODO: Only Subscriber can post property -- Add a Subscripotion Guard or something like that.
  @Post()
  create(@Body() createPropertyDto: CreatePropertyDto, @CurrentUser() user:AuthUser) {
    return this.propertyService.create(createPropertyDto, user);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: Record<string, any>,  ) {
    console.log(user)
    return this.propertyService.findAll(user, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.propertyService.findOne(id);
  }


  // Property Update
  // Private
  // Only property owner can update their own property
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePropertyDto: UpdatePropertyDto,
    @CurrentUser() user:AuthUser


  ) {
    return this.propertyService.update(id, updatePropertyDto, user);
  }


  // Property Delete
  // Private
  // Only property owner can delete their own property

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user:AuthUser) {
    return this.propertyService.remove(id, user);
  }
}
