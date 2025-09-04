import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisClientType, createClient } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClientType;
  private readonly isEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.isEnabled = this.configService.get<boolean>('REDIS_ENABLED', false);
  }

  async onModuleInit(): Promise<void> {
    if (!this.isEnabled) {
      this.logger.log('Redis is disabled, skipping connection');
      return;
    }

    this.logger.log('Initializing Redis connection...');

    try {
      this.client = createClient({
        socket: {
          host: this.configService.get<string>('REDIS_HOST', 'localhost'),
          port: this.configService.get<number>('REDIS_PORT', 6379),
          connectTimeout: 10000, // 连接超时
          commandTimeout: 5000, // 命令超时
          lazyConnect: true, // 延迟连接
          keepAlive: true, // 保持连接
          noDelay: true, // 禁用Nagle算法
        },
        password: this.configService.get<string>('REDIS_PASSWORD') || undefined,
        database: this.configService.get<number>('REDIS_DB', 0),

        // 性能优化配置
        isolationPoolOptions: {
          min: 2, // 最小连接数
          max: 10, // 最大连接数
        },

        // 重连配置
        reconnectStrategy: (retries: number) => {
          if (retries > 5) {
            this.logger.error('Redis reconnect failed after 5 attempts');
            return false;
          }
          return Math.min(retries * 100, 3000); // 递增重连延迟，最大3秒
        },

        // 命令队列配置
        commandsQueueMaxLength: 1000,

        // 字符串编码
        encoding: 'utf8',
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
    if (ttl) {
      await this.client.setEx(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
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
    if (ttl) {
      await this.client.setEx(key, ttl, jsonValue);
    } else {
      await this.client.set(key, jsonValue);
    }
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
   * 批量获取多个键的值
   */
  async mget(keys: string[]): Promise<(string | null)[]> {
    if (!this.isEnabled || !this.client || keys.length === 0) {
      return [];
    }
    return this.client.mGet(keys);
  }

  /**
   * 批量设置多个键值对
   */
  async mset(keyValuePairs: Record<string, string>): Promise<void> {
    if (
      !this.isEnabled ||
      !this.client ||
      Object.keys(keyValuePairs).length === 0
    ) {
      return;
    }
    await this.client.mSet(keyValuePairs);
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
    return this.client.expire(key, seconds);
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
   * 自增操作
   */
  async incr(key: string): Promise<number> {
    if (!this.isEnabled || !this.client) {
      return 0;
    }
    return this.client.incr(key);
  }

  /**
   * 按指定值自增
   */
  async incrBy(key: string, increment: number): Promise<number> {
    if (!this.isEnabled || !this.client) {
      return 0;
    }
    return this.client.incrBy(key, increment);
  }

  /**
   * 自减操作
   */
  async decr(key: string): Promise<number> {
    if (!this.isEnabled || !this.client) {
      return 0;
    }
    return this.client.decr(key);
  }

  /**
   * 按指定值自减
   */
  async decrBy(key: string, decrement: number): Promise<number> {
    if (!this.isEnabled || !this.client) {
      return 0;
    }
    return this.client.decrBy(key, decrement);
  }

  /**
   * 集合操作 - 添加成员
   */
  async sadd(key: string, ...members: string[]): Promise<number> {
    if (!this.isEnabled || !this.client) {
      return 0;
    }
    return this.client.sAdd(key, members);
  }

  /**
   * 集合操作 - 获取所有成员
   */
  async smembers(key: string): Promise<string[]> {
    if (!this.isEnabled || !this.client) {
      return [];
    }
    return this.client.sMembers(key);
  }

  /**
   * 集合操作 - 检查成员是否存在
   */
  async sismember(key: string, member: string): Promise<boolean> {
    if (!this.isEnabled || !this.client) {
      return false;
    }
    return this.client.sIsMember(key, member);
  }

  /**
   * 有序集合操作 - 添加成员
   */
  async zadd(key: string, score: number, member: string): Promise<number> {
    if (!this.isEnabled || !this.client) {
      return 0;
    }
    return this.client.zAdd(key, { score, value: member });
  }

  /**
   * 有序集合操作 - 获取指定范围的成员
   */
  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    if (!this.isEnabled || !this.client) {
      return [];
    }
    return this.client.zRange(key, start, stop);
  }

  /**
   * 获取Redis客户端实例（用于复杂操作）
   */
  getClient(): RedisClientType | null {
    return this.isEnabled ? this.client : null;
  }

  /**
   * 执行Redis管道操作（批量命令）
   * 使用示例：
   * const pipeline = this.redisService.pipeline();
   * pipeline.set('key1', 'value1');
   * pipeline.set('key2', 'value2');
   * await pipeline.exec();
   */
  pipeline(): unknown {
    if (!this.isEnabled || !this.client) {
      return null;
    }
    return this.client.multi();
  }

  /**
   * 获取系统信息和性能统计
   */
  async getInfo(): Promise<string | null> {
    if (!this.isEnabled || !this.client) {
      return null;
    }
    return this.client.info();
  }

  /**
   * 获取连接状态
   */
  isConnected(): boolean {
    return this.isEnabled && this.client && this.client.isOpen;
  }
}
