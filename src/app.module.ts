import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { MongooseConnectionsModule } from './common/database/database.module';

import { NotificationSettingsModule } from './notification-settings/notification-settings.module';
import { NotificationModule } from './notification/notification.module';
import { PropertyModule } from './property/property.module';
import { UserModule } from './user/user.module';
import { ServiceModule } from './service/service.module';
import { PaymentModule } from './payment/payment.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { ArticleModule } from './article/article.module';
import { MailModule } from './mail/mail.module';
import { ContactModule } from './contact/contact.module';
import { AwsService } from './common/aws/aws.service';
import { AwsModule } from './common/aws/aws.module';
import { DocumentModule } from './document/document.module';
import { RedisModule } from './redis/redis.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [
    AwsModule,
    MongooseConnectionsModule,
    RedisModule,        // Global Redis Pub/Sub (must come before ChatModule)
    AuthModule,
    PropertyModule,
    UserModule,
    NotificationModule,
    NotificationSettingsModule,
    ServiceModule,
    PaymentModule,
    MaintenanceModule,
    ArticleModule,
    MailModule,
    ContactModule,
    DocumentModule,
    ChatModule,         // Real-time chat system
  ],

  controllers: [],
  providers: [AwsService],
})
export class AppModule {}
