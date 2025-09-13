/**
 * 认证模块 - 精简版
 */

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '@/prisma';
import { RedisModule } from '@/redis';
import { SmsModule } from '@/modules/sms/sms.module';
import { EmailModule } from '@/modules/email/email.module';
import { BaseAuthService } from './services/base-auth.service';
import { AdminAuthService } from './services/admin-auth.service';
import { MerchantAuthService } from './services/merchant-auth.service';
import { CustomerAuthService } from './services/customer-auth.service';
import { AuthGuard } from './guards/auth.guard';
import { AdminAuthController } from './controllers/admin-auth.controller';
import { MerchantAuthController } from './controllers/merchant-auth.controller';
import { CustomerAuthController } from './controllers/customer-auth.controller';

@Module({
  imports: [
    PrismaModule,
    RedisModule, // 添加Redis模块支持
    SmsModule, // 添加短信服务模块
    EmailModule, // 添加邮件服务模块
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '7d'),
        },
      }),
      inject: [ConfigService],
      global: true, // 使JwtModule全局可用
    }),
  ],
  controllers: [
    AdminAuthController,
    MerchantAuthController,
    CustomerAuthController,
  ],
  providers: [
    BaseAuthService,
    AdminAuthService,
    MerchantAuthService,
    CustomerAuthService,
    AuthGuard,
  ],
  exports: [
    BaseAuthService,
    AdminAuthService,
    MerchantAuthService,
    CustomerAuthService,
    AuthGuard,
    JwtModule,
  ],
})
export class AuthModule {}
