import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_METADATA_KEY = 'rate_limit_options';

export type RateLimitOptions = {
  windowMs: number; // janela em ms
  max: number; // máximo dentro da janela
  includeBodyFields?: string[]; // campos do body para compor a chave (ex.: ['email'])
};

export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_METADATA_KEY, options);
