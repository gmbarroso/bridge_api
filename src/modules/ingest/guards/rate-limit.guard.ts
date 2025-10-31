import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

interface RateLimitWindow {
  requests: number[];
  firstRequest: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly requestWindows = new Map<string, RateLimitWindow>();
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly cleanupInterval: number;

  constructor(private readonly configService: ConfigService) {
    this.maxRequests = this.configService.get<number>('security.rateLimitMaxRequests', 100);
    this.windowMs = this.configService.get<number>('security.rateLimitWindowMs', 60000); // 1 minute
    this.cleanupInterval = this.configService.get<number>('security.rateLimitCleanupInterval', 300000); // 5 minutes

    setInterval(() => this.cleanupExpiredWindows(), this.cleanupInterval);
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      // If no API key, let ApiKeyGuard handle it
      return true;
    }

    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get or create rate limit window for this API key
    let window = this.requestWindows.get(apiKey);
    
    if (!window) {
      window = {
        requests: [],
        firstRequest: now,
      };
      this.requestWindows.set(apiKey, window);
    }

    // Clean old requests outside the current window
    window.requests = window.requests.filter(timestamp => timestamp > windowStart);

    // Check if rate limit is exceeded
    if (window.requests.length >= this.maxRequests) {
      const resetTime = Math.ceil((window.requests[0] + this.windowMs) / 1000);

      throw new HttpException(
        {
          message: 'Rate limit exceeded',
          retryAfter: resetTime,
          limit: this.maxRequests,
          windowMs: this.windowMs,
          remaining: 0,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Add current request to window
    window.requests.push(now);

    // Log rate limiting info (for monitoring)
    const remaining = this.maxRequests - window.requests.length;

    // Add rate limit headers to response
    const response = context.switchToHttp().getResponse();
    response.setHeader('X-RateLimit-Limit', this.maxRequests);
    response.setHeader('X-RateLimit-Remaining', remaining);
    response.setHeader('X-RateLimit-Reset', Math.ceil((now + this.windowMs) / 1000));

    return true;
  }

  private extractApiKey(request: Request): string | undefined {
    return (
      request.headers['x-api-key'] as string ||
      request.headers['X-API-Key'] as string
    );
  }

  private cleanupExpiredWindows(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [apiKey, window] of this.requestWindows.entries()) {
      // Remove windows that haven't been used for more than the cleanup interval
      if (now - window.firstRequest > this.cleanupInterval) {
        expiredKeys.push(apiKey);
      }
    }

    expiredKeys.forEach(key => {
      this.requestWindows.delete(key);
    });
  }

  /**
   * Get current rate limit status for an API key (for debugging/monitoring)
   */
  getRateLimitStatus(apiKey: string): { requests: number; remaining: number; resetTime: number } | null {
    const window = this.requestWindows.get(apiKey);
    if (!window) {
      return null;
    }

    const now = Date.now();
    const windowStart = now - this.windowMs;
    const activeRequests = window.requests.filter(timestamp => timestamp > windowStart);
    
    return {
      requests: activeRequests.length,
      remaining: Math.max(0, this.maxRequests - activeRequests.length),
      resetTime: Math.ceil((now + this.windowMs) / 1000),
    };
  }
}
