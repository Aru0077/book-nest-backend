/**
 * 基础认证服务 - 共享认证逻辑
 */

import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '@/prisma';
import { RedisService } from '@/redis';
import { BusinessError } from '@/common/exceptions';
import {
  AdminRole,
  CachedUser,
  JwtPayload,
  RefreshTokenResponse,
  UserRole,
  RefreshTokenPayload as _RefreshTokenPayload,
} from '../auth.types';
@Injectable()
export class BaseAuthService {
  protected readonly logger = new Logger(BaseAuthService.name);

  constructor(
    protected prisma: PrismaService,
    protected redis: RedisService,
    protected jwtService: JwtService,
    protected configService: ConfigService,
  ) {}

  /**
   * 验证密码
   */
  async validatePassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<void> {
    const isValid = await bcrypt.compare(plainPassword, hashedPassword);
    if (!isValid) throw BusinessError.invalidCredentials();
  }

  /**
   * 生成JWT双令牌(访问令牌 + 刷新令牌)
   */
  async generateTokens(
    userId: string,
    role: UserRole,
    email?: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    refreshExpiresIn: number;
  }> {
    const payload: JwtPayload = {
      sub: userId,
      role,
      email,
    };

    const jwtExpiresIn = this.configService.get<string>('jwt.expiresIn', '7d');
    const jwtRefreshExpiresIn = this.configService.get<string>(
      'jwt.refreshExpiresIn',
      '30d',
    );

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: jwtExpiresIn,
    });

    const refreshPayload = { ...payload, type: 'refresh' };
    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
      expiresIn: jwtRefreshExpiresIn,
    });

    const expiresIn = this.convertToSeconds(jwtExpiresIn);
    const refreshExpiresIn = this.convertToSeconds(jwtRefreshExpiresIn);

    const refreshTokenKey = `refresh_token:${userId}`;
    await this.redis.set(refreshTokenKey, refreshToken, refreshExpiresIn);

    return { accessToken, refreshToken, expiresIn, refreshExpiresIn };
  }

  /**
   * 刷新访问令牌
   */
  async refreshAccessToken(
    refreshToken: string,
  ): Promise<RefreshTokenResponse> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      }) as _RefreshTokenPayload;

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('无效的刷新令牌');
      }

      const storedToken = await this.redis.get(`refresh_token:${payload.sub}`);
      if (!storedToken || storedToken !== refreshToken) {
        throw new UnauthorizedException('刷新令牌已失效');
      }

      const user = await this.getUserFromCache(payload.sub, payload.role);
      if (!user) {
        throw new UnauthorizedException('用户不存在或已被禁用');
      }

      const tokens = await this.generateTokens(
        payload.sub,
        payload.role,
        payload.email,
      );

      return tokens;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('刷新令牌验证失败');
    }
  }

  /**
   * 从 Redis 缓存获取用户信息
   */
  async getUserFromCache(
    userId: string,
    role: UserRole,
  ): Promise<CachedUser | null> {
    const cacheKey = `user:${role}:${userId}`;

    let user = await this.redis.getObject<CachedUser>(cacheKey);

    if (!user) {
      const dbUser = await this.getUserByRole(userId, role);
      if (!dbUser) {
        return null;
      }

      user = {
        id: dbUser.id,
        role,
        email: dbUser.email,
        phone: dbUser.phone,
        status: dbUser.status,
        adminRole: dbUser.adminRole as AdminRole,
      };

      await this.redis.setObject(cacheKey, user, 15 * 60);
      this.logger.debug(`用户信息已缓存: ${cacheKey}`);
    }

    return user;
  }

  /**
   * 清除用户缓存
   */
  async clearUserCache(userId: string, role: UserRole): Promise<void> {
    const cacheKey = `user:${role}:${userId}`;
    await this.redis.del(cacheKey);
    this.logger.debug(`已清除用户缓存: ${cacheKey}`);
  }

  /**
   * 用户安全注销
   */
  async logout(userId: string, role: UserRole): Promise<void> {
    await this.redis.del(`refresh_token:${userId}`);
    await this.clearUserCache(userId, role);
    this.logger.log(`用户已安全注销: ${userId}`);
  }

  /**
   * 根据角色获取用户信息
   */
  private async getUserByRole(
    userId: string,
    role: UserRole,
  ): Promise<{
    id: string;
    email: string | null;
    phone: string | null;
    username?: string | null;
    status: string;
    adminRole?: string;
  } | null> {
    switch (role) {
      case UserRole.ADMIN: {
        const admin = await this.prisma.adminUser.findUnique({
          where: { id: userId, status: 'ACTIVE' },
          select: {
            id: true,
            email: true,
            phone: true,
            username: true,
            status: true,
            role: true,
          },
        });
        if (admin) {
          return {
            ...admin,
            adminRole: admin.role,
          };
        }
        return admin;
      }
      case UserRole.MERCHANT: {
        const merchant = await this.prisma.merchantUser.findUnique({
          where: { id: userId, status: 'ACTIVE' },
          select: {
            id: true,
            email: true,
            phone: true,
            status: true,
          },
        });
        if (merchant) {
          return {
            ...merchant,
            username: null, // merchant表不再有username字段
          };
        }
        return merchant;
      }
      case UserRole.CUSTOMER:
        return this.prisma.customerUser.findUnique({
          where: { id: userId, status: 'ACTIVE' },
          select: {
            id: true,
            email: true,
            phone: true,
            username: true,
            status: true,
          },
        });
      default:
        return null;
    }
  }

  /**
   * 将时间字符串转换为秒数
   */
  private convertToSeconds(timeString: string): number {
    switch (timeString) {
      case '7d':
        return 7 * 24 * 60 * 60;
      case '30d':
        return 30 * 24 * 60 * 60;
      case '15m':
        return 15 * 60;
      case '1h':
        return 60 * 60;
      default: {
        const match = timeString.match(/^(\d+)([smhd])$/);
        if (!match) return 0;

        const value = parseInt(match[1], 10);
        const unit = match[2];

        switch (unit) {
          case 's':
            return value;
          case 'm':
            return value * 60;
          case 'h':
            return value * 60 * 60;
          case 'd':
            return value * 24 * 60 * 60;
          default:
            return 0;
        }
      }
    }
  }
}
