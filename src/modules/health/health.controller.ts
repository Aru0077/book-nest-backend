import {
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { CustomThrottle } from '@/common/decorators/throttle.decorator';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  @Get()
  @Public()
  @CustomThrottle({ short: { limit: 10, ttl: 10000 } }) // 健康检查限流
  @ApiOperation({ summary: '基础健康检查' })
  @ApiResponse({
    status: 200,
    description: '服务运行正常',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2025-08-31T11:00:00.000Z' },
        uptime: { type: 'number', example: 123.456 },
        version: { type: 'string', example: '1.0.0' },
        environment: { type: 'string', example: 'development' },
      },
    },
  })
  check(): {
    status: string;
    timestamp: string;
    uptime: number;
    version: string;
    environment: string;
  } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: this.configService.get<string>('app.swagger.version') || '1.0.0',
      environment: this.configService.get<string>('app.env') || 'development',
    };
  }

  @Get('detailed')
  @Public()
  @CustomThrottle({ short: { limit: 5, ttl: 10000 } }) // 详细检查限流
  @ApiOperation({ summary: '详细健康检查 (包含数据库和Redis)' })
  @ApiResponse({
    status: 200,
    description: '返回详细健康状态',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string' },
        uptime: { type: 'number' },
        database: { type: 'boolean' },
        redis: { type: 'boolean' },
        services: {
          type: 'object',
          properties: {
            database: { type: 'string', example: 'healthy' },
            redis: { type: 'string', example: 'healthy' },
          },
        },
      },
    },
  })
  async detailedCheck(): Promise<{
    status: string;
    timestamp: string;
    uptime: number;
    database: boolean;
    redis: boolean;
    services: {
      database: string;
      redis: string;
    };
  }> {
    const [dbHealthy, redisHealthy] = await Promise.all([
      this.prismaService.healthCheck(),
      this.redisService.healthCheck(),
    ]);

    return {
      status: dbHealthy && redisHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbHealthy,
      redis: redisHealthy,
      services: {
        database: dbHealthy ? 'healthy' : 'unhealthy',
        redis: redisHealthy ? 'healthy' : 'unhealthy',
      },
    };
  }

  @Get('config')
  @Public()
  @ApiOperation({ summary: '配置信息 (仅开发环境)' })
  @ApiResponse({ status: 200, description: '返回配置信息' })
  @ApiResponse({ status: 403, description: '仅开发环境可用' })
  getConfig(): {
    app: {
      name: string;
      port: number;
      env: string;
      apiPrefix: string;
    };
    throttle: {
      ttl: number;
      limit: number;
    };
    redis: {
      enabled: boolean;
      host: string;
      port: number;
    };
  } {
    const env = this.configService.get<string>('app.env');
    if (env !== 'development') {
      throw new ForbiddenException('配置信息仅在开发环境可见');
    }

    return {
      app: {
        name: this.configService.get<string>('app.name') || 'BookNest API',
        port: this.configService.get<number>('app.port') || 3000,
        env: this.configService.get<string>('app.env') || 'development',
        apiPrefix: this.configService.get<string>('app.apiPrefix') || 'api/v1',
      },
      throttle: {
        ttl: this.configService.get<number>('app.throttle.ttl') || 60000,
        limit: this.configService.get<number>('app.throttle.limit') || 100,
      },
      redis: {
        enabled: this.configService.get<boolean>('app.redis.enabled') || false,
        host: this.configService.get<string>('app.redis.host') || 'localhost',
        port: this.configService.get<number>('app.redis.port') || 6379,
      },
    };
  }

  @Get('error')
  @Public()
  @ApiOperation({ summary: '异常测试接口' })
  @ApiResponse({ status: 404, description: '测试404错误' })
  testError(): never {
    throw new NotFoundException('这是一个测试错误，用于验证异常处理系统');
  }

  @Get('validation-error')
  @Public()
  @ApiOperation({ summary: '验证错误测试接口' })
  @ApiResponse({ status: 422, description: '测试验证错误' })
  testValidationError(): never {
    throw new UnprocessableEntityException('用户输入数据格式不正确');
  }
}
