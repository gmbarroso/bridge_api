import { Controller, Get, Header } from '@nestjs/common';
import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4')
  async getMetrics(): Promise<string> {
    if (!this.metrics.registry) {
      return '# metrics disabled (prom-client not installed)\n';
    }
    // prom-client register outputs text exposition format
    return await this.metrics.registry.metrics();
  }
}
