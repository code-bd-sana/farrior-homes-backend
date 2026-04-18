import { Controller, Get } from '@nestjs/common';
import { ReviewsService } from './reviews.service';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('videos')
  async getVideos() {
    return await this.reviewsService.getVideos();
  }
}
