/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

@Injectable()
export class ResponseInterceptorInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const response = ctx.getResponse();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const request = ctx.getRequest();

    return next.handle().pipe(
      map((data) => ({
        success: true,
        message: 'Request successful',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        method: request.method,
        endpoint: request.url,
        statusCode: response.statusCode,
        timestamp: new Date().toISOString(),
        data: data,
      })),
    );
  }
}
