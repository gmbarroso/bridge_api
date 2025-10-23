import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from '../observability/metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();

    const method = (req.method || 'GET').toUpperCase();
    const route = req.route?.path || req.path || req.url || 'unknown';
    const start = (req._startTime as bigint) || process.hrtime.bigint();

    return next.handle().pipe(
      tap({
        next: () => this.observe(method, route, res.statusCode, start),
        error: () => this.observe(method, route, res.statusCode || 500, start),
      }),
    );
  }

  private observe(method: string, route: string, status: number, start: bigint) {
    if (!this.metrics.httpRequestsTotal || !this.metrics.httpRequestDuration) return;
    const labels = { method, route, status: String(status) };
    const durSeconds = Number((process.hrtime.bigint() - start)) / 1e9;
    this.metrics.httpRequestsTotal.inc(labels, 1);
    this.metrics.httpRequestDuration.observe(labels, durSeconds);
  }
}
