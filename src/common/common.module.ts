import { Module } from '@nestjs/common';
import { CacheService } from './cache/cache.service';
import { MetricsService } from './observability/metrics.service';

@Module({
  providers: [CacheService, MetricsService],
  exports: [CacheService, MetricsService],
})
export class CommonModule {}
