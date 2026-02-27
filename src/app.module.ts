import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { MongooseConnectionsModule } from './common/database/database.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [MongooseConnectionsModule, AuthModule, UserModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
