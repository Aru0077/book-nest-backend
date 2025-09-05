import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisClientType, createClient } from 'redis';
import { AppConfig } from '@/config/configuration';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClientType;
  private readonly isEnabled: boolean;
  private readonly defaultTtl: number;

  constructor(private readonly configService: ConfigService) {
    this.isEnabled = this.configService.get<boolean>(
      'app.redis.enabled',
      false,
    );
    this.defaultTtl = this.configService.get<number>('app.redis.ttl', 300);
  }

  async onModuleInit(): Promise<void> {
    if (!this.isEnabled) {
      this.logger.log('Redis is disabled, skipping connection');
      return;
    }

    this.logger.log('Initializing Redis connection...');

    try {
      const redisConfig =
        this.configService.get<AppConfig['redis']>('app.redis')!;
      this.client = createClient({
        socket: {
          host: redisConfig.host,
          port: redisConfig.port,
          connectTimeout: 10000, // 连接超时
          keepAlive: true, // 保持连接
          noDelay: true, // 禁用Nagle算法
        },
        password: redisConfig.password || undefined,
        database: redisConfig.db,
      });

      this.client.on('error', (err) => {
        this.logger.error('Redis Client Error:', err);
      });

      this.client.on('connect', () => {
        this.logger.log('Redis client connected');
      });

      this.client.on('ready', () => {
        this.logger.log('Redis client ready');
      });

      await this.client.connect();
      this.logger.log('Redis connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      this.logger.log('Closing Redis connection...');
      await this.client.quit();
      this.logger.log('Redis connection closed');
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.isEnabled || !this.client) {
      return null;
    }
    return this.client.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (!this.isEnabled || !this.client) {
      return;
    }
    const expireTime = ttl ?? this.defaultTtl;
    await this.client.setEx(key, expireTime, value);
  }

  async del(key: string): Promise<number> {
    if (!this.isEnabled || !this.client) {
      return 0;
    }
    return this.client.del(key);
  }

  async exists(key: string): Promise<number> {
    if (!this.isEnabled || !this.client) {
      return 0;
    }
    return this.client.exists(key);
  }

  /**
   * 设置JSON对象
   */
  async setObject<T>(key: string, value: T, ttl?: number): Promise<void> {
    if (!this.isEnabled || !this.client) {
      return;
    }
    const jsonValue = JSON.stringify(value);
    const expireTime = ttl ?? this.defaultTtl;
    await this.client.setEx(key, expireTime, jsonValue);
  }

  /**
   * 获取JSON对象
   */
  async getObject<T>(key: string): Promise<T | null> {
    if (!this.isEnabled || !this.client) {
      return null;
    }
    const value = await this.client.get(key);
    if (!value) {
      return null;
    }
    try {
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(`Failed to parse JSON for key ${key}:`, error);
      return null;
    }
  }

  /**
   * 删除多个key（支持模式匹配）
   */
  async deletePattern(pattern: string): Promise<number> {
    if (!this.isEnabled || !this.client) {
      return 0;
    }
    const keys = await this.client.keys(pattern);
    if (keys.length === 0) {
      return 0;
    }
    return this.client.del(keys);
  }

  async healthCheck(): Promise<boolean> {
    if (!this.isEnabled) {
      return true;
    }

    try {
      if (!this.client) {
        return false;
      }
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      this.logger.error('Redis health check failed:', error);
      return false;
    }
  }

  /**
   * 列表操作 - 头部插入
   */
  async lpush(key: string, ...values: string[]): Promise<number> {
    if (!this.isEnabled || !this.client) {
      return 0;
    }
    return this.client.lPush(key, values);
  }

  /**
   * 列表操作 - 获取范围内的元素
   */
  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    if (!this.isEnabled || !this.client) {
      return [];
    }
    return this.client.lRange(key, start, stop);
  }

  /**
   * 列表操作 - 修剪列表，只保留指定范围的元素
   */
  async ltrim(key: string, start: number, stop: number): Promise<void> {
    if (!this.isEnabled || !this.client) {
      return;
    }
    await this.client.lTrim(key, start, stop);
  }

  /**
   * 列表操作 - 获取列表长度
   */
  async llen(key: string): Promise<number> {
    if (!this.isEnabled || !this.client) {
      return 0;
    }
    return this.client.lLen(key);
  }

  /**
   * 设置键的过期时间（秒）
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    if (!this.isEnabled || !this.client) {
      return false;
    }
    const result = await this.client.expire(key, seconds);
    return result === 1; // Redis返回1表示成功，0表示失败
  }

  /**
   * 获取键的剩余过期时间（秒）
   */
  async ttl(key: string): Promise<number> {
    if (!this.isEnabled || !this.client) {
      return -2; // 键不存在
    }
    return this.client.ttl(key);
  }

  /**
   * 获取连接状态
   */
  isConnected(): boolean {
    return this.isEnabled && this.client && this.client.isOpen;
  }
}
