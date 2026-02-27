import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { MongooseConnectionsModule } from './common/database/database.module';
import { PropertyModule } from './property/property.module';

@Module({
  imports: [MongooseConnectionsModule, AuthModule, PropertyModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
