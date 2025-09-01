import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerMiddleware } from '@/common/middleware/logger.middleware';
import { HttpExceptionFilter } from '@/common/filters/http-exception.filter';
import { ResponseInterceptor } from '@/common/interceptors/response.interceptor';
import { HealthModule } from '@/modules/health/health.module';
import { PrismaModule } from '@/prisma';
import { RedisModule } from '@/redis';
import { configOptions } from '@/config';

@Module({
  imports: [
    // 全局配置模块
    ConfigModule.forRoot(configOptions),
    // 数据库模块
    PrismaModule,
    // Redis模块
    RedisModule,
    // 限流模块
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('app.throttle.ttl', 60000),
          limit: configService.get<number>('app.throttle.limit', 100),
        },
      ],
      inject: [ConfigService],
    }),
    // 健康检查模块
    HealthModule,
  ],
  controllers: [],
  providers: [
    // 全局异常过滤器
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    // 全局响应拦截器
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    // 全局限流守卫
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // TODO: JWT认证守卫（待实现）
    // {
    //   provide: APP_GUARD,
    //   useClass: AuthGuard,
    // },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
