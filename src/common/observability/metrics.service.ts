import { Injectable, OnModuleInit } from '@nestjs/common';

@Injectable()
export class MetricsService implements OnModuleInit {
  private prom: any | null = null;
  public registry: any | null = null;
  public httpRequestsTotal: any | null = null;
  public httpRequestDuration: any | null = null;

  constructor() {
    // Defer loading prom-client to runtime to avoid build-time dependency
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      this.prom = require('prom-client');
      this.registry = new this.prom.Registry();
      this.httpRequestsTotal = new this.prom.Counter({
        name: 'http_requests_total',
        help: 'Total HTTP requests',
        registers: [this.registry],
        labelNames: ['method', 'route', 'status'],
      });
      this.httpRequestDuration = new this.prom.Histogram({
        name: 'http_request_duration_seconds',
        help: 'HTTP request duration in seconds',
        registers: [this.registry],
        labelNames: ['method', 'route', 'status'],
        buckets: [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5],
      });
    } catch {
      // Metrics disabled (prom-client not installed)
      this.prom = null;
      this.registry = null;
      this.httpRequestsTotal = null;
      this.httpRequestDuration = null;
    }
  }

  onModuleInit() {
    if (this.prom && this.registry) {
      this.prom.collectDefaultMetrics({ register: this.registry });
    }
  }
}
