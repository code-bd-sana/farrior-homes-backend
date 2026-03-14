import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AwsService } from 'src/common/aws/aws.service';
import { Document, DocumentSchema } from 'src/schemas/document.schema';
import { User, UserSchema } from 'src/schemas/user.schema';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Document.name,
        schema: DocumentSchema,
      },
      {
        name: User.name,
        schema: UserSchema,
      },
    ]),
  ],
  controllers: [DocumentController],
  providers: [DocumentService, AwsService],
})
export class DocumentModule {}
