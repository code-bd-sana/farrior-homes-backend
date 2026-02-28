import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class SubscribedUserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: { isSubscribed?: boolean } }>();

    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (!user.isSubscribed) {
      throw new ForbiddenException(
        'You need an active subscription to access this resource',
      );
    }

    return true;
  }
}
