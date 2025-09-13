import { registerAs } from '@nestjs/config';

/**
 * 应用程序配置类型定义
 */
export interface AppConfig {
  name: string;
  env: string;
  port: number;
  apiPrefix: string;
  corsOrigin: string;
  database: {
    url: string;
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    schema: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };
  redis: {
    enabled: boolean;
    host: string;
    port: number;
    password: string;
    db: number;
    ttl: number;
  };
  throttle: {
    ttl: number;
    limit: number;
  };
  swagger: {
    title: string;
    description: string;
    version: string;
  };
  sms: {
    accessKeyId: string;
    accessKeySecret: string;
    signName: string;
    templateCode: string;
  };
  email: {
    accessKeyId: string;
    accessKeySecret: string;
    region: string;
    endpoint: string;
    accountName: string;
    fromAlias: string;
  };
}

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

  // 短信服务配置 (阿里云官方推荐配置)
  sms: {
    accessKeyId: process.env.ALIBABA_CLOUD_ACCESS_KEY_ID || '',
    accessKeySecret: process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET || '',
    signName: process.env.ALIYUN_SMS_SIGN_NAME || '',
    templateCode: process.env.ALIYUN_SMS_TEMPLATE_CODE || '',
  },

  // 邮件推送服务配置 (阿里云官方推荐配置)
  email: {
    accessKeyId: process.env.ALIBABA_CLOUD_ACCESS_KEY_ID || '',
    accessKeySecret: process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET || '',
    region: process.env.ALIYUN_DIRECTMAIL_REGION || 'ap-southeast-1',
    endpoint: process.env.ALIYUN_DIRECTMAIL_ENDPOINT || 'dm.aliyuncs.com',
    accountName: process.env.ALIYUN_DIRECTMAIL_ACCOUNT_NAME || '',
    fromAlias: process.env.ALIYUN_DIRECTMAIL_FROM_ALIAS || 'BookNest',
  },
}));
