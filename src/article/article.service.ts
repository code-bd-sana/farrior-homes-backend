import { Injectable } from '@nestjs/common';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Article } from 'src/schemas/article.schema';
import { Model } from 'mongoose';

@Injectable()


export class ArticleService {

 constructor(
    @InjectModel(Article.name) private readonly userModel: Model<Article>,

  ) {}
  create(createArticleDto: CreateArticleDto) {
    return 'This action adds a new article';
  }

  findAll() {
    return `This action returns all article`;
  }

  findOne(id: number) {
    return `This action returns a #${id} article`;
  }

  update(id: number, updateArticleDto: UpdateArticleDto) {
    return `This action updates a #${id} article`;
  }

  remove(id: number) {
    return `This action removes a #${id} article`;
  }
}
