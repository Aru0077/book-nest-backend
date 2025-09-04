/**
 * 认证模块 - 精简版
 */

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '@/prisma';
import { RedisModule } from '@/redis';
import { AuthService } from './services/auth.service';
import { AuthGuard } from './guards/auth.guard';
import { AdminAuthController } from './controllers/admin-auth.controller';
import { MerchantAuthController } from './controllers/merchant-auth.controller';
import { CustomerAuthController } from './controllers/customer-auth.controller';

@Module({
  imports: [
    PrismaModule,
    RedisModule, // 添加Redis模块支持
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
  providers: [AuthService, AuthGuard],
  exports: [AuthService, AuthGuard, JwtModule], // 导出JwtModule
})
export class AuthModule {}
