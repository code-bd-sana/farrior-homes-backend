import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SubscribedUserGuard } from 'src/auth/guards/subscribed-user.guard';
import { AwsService } from 'src/common/aws/aws.service';
import { MailModule } from 'src/mail/mail.module';
import { Payment, PaymentSchema } from 'src/schemas/payment.schema';
import { Property, PropertySchema } from 'src/schemas/property.schema';
import {
  SaveProperty,
  SavePropertySchema,
} from 'src/schemas/save-property.schema';
import { User, UserSchema } from 'src/schemas/user.schema';
import { PropertyController } from './property.controller';
import { PropertyService } from './property.service';

@Module({
  imports: [
    MailModule,
    MongooseModule.forFeature([
      { name: Property.name, schema: PropertySchema },
      { name: SaveProperty.name, schema: SavePropertySchema },
      { name: User.name, schema: UserSchema },
      { name: Payment.name, schema: PaymentSchema },
    ]),
  ],
  controllers: [PropertyController],
  providers: [PropertyService, SubscribedUserGuard, AwsService],
})
export class PropertyModule {}
