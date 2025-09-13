import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerMiddleware } from '@/common/middleware/logger.middleware';
import { HttpExceptionFilter } from '@/common/filters/http-exception.filter';
import { ResponseInterceptor } from '@/common/interceptors/response.interceptor';
import { HealthModule } from '@/modules/health/health.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { AuthGuard } from '@/modules/auth/guards/auth.guard';
import { SmsModule } from '@/modules/sms/sms.module';
import { EmailModule } from '@/modules/email/email.module';
import { PrismaModule } from '@/prisma';
import { RedisModule } from '@/redis';
import { configOptions } from '@/config';
import { AppConfig } from '@/config/configuration';

@Module({
  imports: [
    // 全局配置模块
    ConfigModule.forRoot(configOptions),
    // 数据库模块
    PrismaModule,
    // Redis模块
    RedisModule,
    // 分级限流模块配置
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const throttleConfig =
          configService.get<AppConfig['throttle']>('app.throttle')!;
        return [
          {
            name: 'short',
            ttl: 1000, // 1秒
            limit: 3, // 1秒内最多3次请求（防止快速点击）
          },
          {
            name: 'medium',
            ttl: 10000, // 10秒
            limit: 20, // 10秒内最多20次请求（正常使用）
          },
          {
            name: 'long',
            ttl: throttleConfig.ttl, // 从配置文件读取
            limit: throttleConfig.limit, // 从配置文件读取
          },
          {
            name: 'auth',
            ttl: 300000, // 5分钟
            limit: 10, // 5分钟内最多10次认证尝试（防暴力破解）
          },
        ];
      },
      inject: [ConfigService],
    }),
    // 认证模块
    AuthModule,
    // 短信服务模块
    SmsModule,
    // 邮件推送服务模块
    EmailModule,
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
    // 全局JWT认证守卫
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
