import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';

type RedisLike = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode: 'EX', ttlSeconds: number): Promise<'OK' | null>;
};

@Injectable()
export class CacheService {
  private client: RedisLike | null = null;
  private memory: Map<string, { v: string; exp: number }> = new Map();
  private enabled = false;
  private defaultTtlSeconds = 30;

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('redis.url');
    this.defaultTtlSeconds = this.config.get<number>('redis.defaultTtlSeconds', 30);

    if (url) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const IORedis = require('ioredis');
        this.client = new IORedis(url, { lazyConnect: false });
        this.enabled = true;
      } catch (e) {
        this.client = null;
        this.enabled = false;
      }
    }
  }

  hash(input: any): string {
    const s = typeof input === 'string' ? input : JSON.stringify(input);
    return createHash('sha1').update(s).digest('hex');
  }

  async get(key: string): Promise<string | null> {
    if (this.enabled && this.client) {
      try {
        return await this.client.get(key);
      } catch {
        // fallback to memory
      }
    }
    const rec = this.memory.get(key);
    if (!rec) return null;
    if (Date.now() > rec.exp) {
      this.memory.delete(key);
      return null;
    }
    return rec.v;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds ?? this.defaultTtlSeconds;
    if (this.enabled && this.client) {
      try {
        await this.client.set(key, value, 'EX', ttl);
        return;
      } catch {
        // fallback to memory
      }
    }
    this.memory.set(key, { v: value, exp: Date.now() + ttl * 1000 });
  }

  async getJSON<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (!raw) return null;
    try { return JSON.parse(raw) as T; } catch { return null; }
  }

  async setJSON(key: string, value: any, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }
}
