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
        },
        password: this.configService.get<string>('REDIS_PASSWORD') || undefined,
        database: this.configService.get<number>('REDIS_DB', 0),
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

  getClient(): RedisClientType | null {
    return this.isEnabled ? this.client : null;
  }
}
