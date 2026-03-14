import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
    Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from 'src/schemas/user.schema';

@Injectable()
export class SubscribedUserGuard implements CanActivate {
  private readonly logger = new Logger(SubscribedUserGuard.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  // This guard checks if the user has an active subscription before allowing access to certain routes.
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: { userId?: string } }>();

    const method = request?.['method'];
    const url = request?.['originalUrl'] || request?.['url'];

    const userId = request.user?.userId;

    this.logger.log(`Checking subscription for ${method} ${url} (userId: ${userId ?? 'N/A'})`);

    // If userId is not present, the user is not authenticated
    if (!userId) {
      this.logger.warn(`Blocked ${method} ${url}: missing authenticated user`);
      throw new ForbiddenException('User not authenticated');
    }

    // Fetch the user from the database to check subscription status
    const user = await this.userModel.findById(userId).select('isSubscribed');

    // If user is not found or does not have an active subscription, deny access
    if (!user) {
      this.logger.warn(`Blocked ${method} ${url}: user not found (${userId})`);
      throw new ForbiddenException('User not found');
    }

    // If the user is not subscribed, throw a ForbiddenException
    if (!user.isSubscribed) {
      this.logger.warn(
        `Blocked ${method} ${url}: user ${userId} has no active subscription`,
      );
      throw new ForbiddenException(
        'You need an active subscription to access this resource',
      );
    }

    this.logger.log(`Allowed ${method} ${url} for subscribed user ${userId}`);

    return true;
  }
}
