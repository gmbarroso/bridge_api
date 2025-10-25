export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  environment: process.env.NODE_ENV || 'development',
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    name: process.env.DB_NAME || 'bridge_api',
    ssl: process.env.NODE_ENV === 'production' || process.env.DB_HOST?.includes('supabase') 
      ? { rejectUnauthorized: false } 
      : false,
  },
  redis: {
    url: process.env.REDIS_URL || '',
    enabled: process.env.REDIS_URL ? true : false,
    defaultTtlSeconds: parseInt(process.env.REDIS_DEFAULT_TTL || '30', 10),
  },
  security: {
    hmacEnabled: process.env.HMAC_ENABLED === 'true',
    hmacTimeWindow: parseInt(process.env.HMAC_TIME_WINDOW || '300', 10),
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    rateLimitCleanupInterval: parseInt(process.env.RATE_LIMIT_CLEANUP_INTERVAL || '300000', 10),
  },
  cors: {
    allowedOrigins: process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3001',
  },
});