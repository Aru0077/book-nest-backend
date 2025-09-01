import { registerAs } from '@nestjs/config';

/**
 * 应用程序配置
 * 统一管理所有环境变量配置
 */
export const appConfig = registerAs('app', () => ({
  // 应用基础配置
  name: process.env.APP_NAME || 'BookNest API',
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',

  // 数据库配置
  database: {
    url:
      process.env.DATABASE_URL ||
      'postgresql://username:password@localhost:5432/book_nest_db',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USERNAME || 'username',
    password: process.env.DATABASE_PASSWORD || 'password',
    database: process.env.DATABASE_NAME || 'book_nest_db',
    schema: process.env.DATABASE_SCHEMA || 'public',
  },

  // JWT认证配置
  jwt: {
    secret:
      process.env.JWT_SECRET || 'development-jwt-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret:
      process.env.JWT_REFRESH_SECRET || 'development-refresh-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  // Redis缓存配置
  redis: {
    enabled: process.env.REDIS_ENABLED === 'true',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB || '0', 10),
    ttl: parseInt(process.env.REDIS_TTL || '300', 10), // 5分钟
  },

  // 限流配置
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL || '60000', 10), // 1分钟
    limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10), // 100次请求
  },

  // Swagger文档配置
  swagger: {
    title: process.env.SWAGGER_TITLE || 'BookNest API文档',
    description:
      process.env.SWAGGER_DESCRIPTION || 'BookNest酒店预订平台API接口文档',
    version: process.env.SWAGGER_VERSION || '1.0.0',
  },
}));
