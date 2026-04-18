import { Injectable } from '@nestjs/common';
import { AwsService } from 'src/common/aws/aws.service';

export interface ReviewVideoItem {
  key: string;
  fileName: string;
  url: string;
}

@Injectable()
export class ReviewsService {
  constructor(private readonly awsService: AwsService) {}

  async getVideos(): Promise<{ message: string; data: ReviewVideoItem[] }> {
    const keys = await this.awsService.listFilesByPrefix('reviews/');

    const videoKeys = keys
      .filter((key) => key.toLowerCase().endsWith('.mp4'))
      .sort((left, right) => left.localeCompare(right));

    const videos = await Promise.all(
      videoKeys.map(async (key) => ({
        key,
        fileName: key.split('/').pop() || key,
        url: await this.awsService.generateSignedUrl(key),
      })),
    );

    return {
      message: 'Review videos fetched successfully',
      data: videos,
    };
  }
}
