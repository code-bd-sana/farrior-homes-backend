import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { MongooseConnectionsModule } from './common/database/database.module';

@Module({
  imports: [MongooseConnectionsModule, AuthModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
