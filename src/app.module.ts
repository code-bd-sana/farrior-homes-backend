import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { MongooseConnectionsModule } from './common/database/database.module';

import { NotificationSettingsModule } from './notification-settings/notification-settings.module';
import { NotificationModule } from './notification/notification.module';
import { PropertyModule } from './property/property.module';
import { UserModule } from './user/user.module';
import { ServiceModule } from './service/service.module';
import { PaymentModule } from './payment/payment.module';

@Module({
  imports: [
    MongooseConnectionsModule,
    AuthModule,
    PropertyModule,
    UserModule,
    NotificationModule,
    NotificationSettingsModule,
    ServiceModule,
    PaymentModule,
  ],

  controllers: [],
  providers: [],
})
export class AppModule {}
