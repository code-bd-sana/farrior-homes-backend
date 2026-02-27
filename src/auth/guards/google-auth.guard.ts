import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard
  extends AuthGuard('google')
  implements CanActivate
{
  canActivate(context: ExecutionContext) {
    const hasGoogleConfig =
      Boolean(process.env.GOOGLE_CLIENT_ID) &&
      Boolean(process.env.GOOGLE_CLIENT_SECRET);

    if (!hasGoogleConfig) {
      throw new ServiceUnavailableException(
        'Google login is not configured on this server',
      );
    }

    return super.canActivate(context);
  }
}
