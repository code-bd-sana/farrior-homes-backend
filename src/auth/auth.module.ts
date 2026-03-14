import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { jwtConfig } from 'src/common/jwt.config';
import { MailModule } from 'src/mail/mail.module';
import { User, UserSchema } from 'src/schemas/user.schema';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleStrategy } from './google.strategy';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { JwtStrategy } from './jwt.strategy';

// TODO: Need to create google client id and secret and add them to .env file to enable google auth functionality
const hasGoogleConfig =
  Boolean(process.env.GOOGLE_CLIENT_ID) &&
  Boolean(process.env.GOOGLE_CLIENT_SECRET);

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    PassportModule,
    JwtModule.register(jwtConfig),
    MailModule,
  ],

  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    ...(hasGoogleConfig ? [GoogleStrategy] : []),
    JwtAuthGuard,
    GoogleAuthGuard,
    RolesGuard,
  ],
  exports: [AuthService],
})
export class AuthModule {}
