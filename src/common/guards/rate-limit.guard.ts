import { CanActivate, ExecutionContext, Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { RATE_LIMIT_METADATA_KEY, RateLimitOptions } from '../decorators/rate-limit.decorator';

type Bucket = { count: number; expiresAt: number };

@Injectable()
export class RateLimitGuard implements CanActivate {
  // Armazenamento em memória (process-local)
  private static store = new Map<string, Bucket>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const handlerOpts = this.reflector.get<RateLimitOptions | undefined>(RATE_LIMIT_METADATA_KEY, context.getHandler());
    const classOpts = this.reflector.get<RateLimitOptions | undefined>(RATE_LIMIT_METADATA_KEY, context.getClass());
    const opts = handlerOpts || classOpts;
    if (!opts) return true; // sem configuração → sem rate limit

    const req = context.switchToHttp().getRequest<Request>();
    const key = this.computeKey(req, opts);
    const now = Date.now();

    const bucket = RateLimitGuard.store.get(key);
    if (!bucket || bucket.expiresAt <= now) {
      RateLimitGuard.store.set(key, { count: 1, expiresAt: now + opts.windowMs });
      return true;
    }

    if (bucket.count >= opts.max) {
      throw new HttpException('Too many requests. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }

    bucket.count += 1;
    RateLimitGuard.store.set(key, bucket);
    return true;
  }

  private computeKey(req: Request, opts: RateLimitOptions): string {
    const ip = (req.ip || req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown').toString();
    const parts = [req.method, req.path, ip];
    if (opts.includeBodyFields && req.body) {
      for (const f of opts.includeBodyFields) {
        const v = (req.body as any)[f];
        if (typeof v === 'string') parts.push(`${f}:${v.toLowerCase()}`);
      }
    }
    return parts.join('|');
  }
}
