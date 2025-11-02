import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class RequestLoggerInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();

    const { method, originalUrl, headers } = req;
    const requestId = headers['x-request-id'] || req.requestId || 'unknown';

    const start = process.hrtime.bigint();

    return next.handle().pipe(
      tap(() => {
        const res = context.switchToHttp().getResponse();
        const duration = Number(process.hrtime.bigint() - start) / 1_000_000; // ms
        this.logger.log(
          `${method} ${originalUrl} ${res.statusCode} - ${duration.toFixed(1)}ms`,
          requestId.toString(),
        );
      }),
    );
  }
}
