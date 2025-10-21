export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  environment: process.env.NODE_ENV || 'development',
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    name: process.env.DB_NAME || 'bridge_api',
  },
  security: {
    hmacEnabled: process.env.HMAC_ENABLED === 'true',
    hmacTimeWindow: parseInt(process.env.HMAC_TIME_WINDOW || '300', 10),
  },
});