import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Observable } from 'rxjs';

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();

    // Reuse incoming X-Request-Id or generate a new one
    const incoming = req.headers['x-request-id'];
    const requestId = (typeof incoming === 'string' && incoming.length > 0) ? incoming : randomUUID();
    req.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);

    // Mark start time for latency
    req._startTime = process.hrtime.bigint();

    return next.handle();
  }
}
