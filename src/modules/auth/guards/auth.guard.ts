/**
 * 统一认证守卫 - 精简版
 */

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '@/common/decorators/public.decorator';
import { ROLES_KEY } from '@/common/decorators/roles.decorator';
import { ADMIN_ROLES_KEY } from '@/common/decorators/admin-roles.decorator';
import { AdminRole, AuthUser, JwtPayload, UserRole } from '../auth.types';
import { PrismaService } from '@/prisma';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 检查是否为公开接口
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    const authHeader = request.headers.authorization;

    if (
      !authHeader ||
      typeof authHeader !== 'string' ||
      !authHeader.startsWith('Bearer ')
    ) {
      throw new UnauthorizedException('缺少认证令牌');
    }

    const token = authHeader.substring(7);

    try {
      // 验证JWT
      const payload: JwtPayload = this.jwtService.verify(token);

      // 获取用户信息并验证状态
      const user = await this.getUserByRole(payload.sub, payload.role);
      if (!user) {
        throw new UnauthorizedException('用户不存在');
      }

      // 检查角色权限
      const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
        ROLES_KEY,
        [context.getHandler(), context.getClass()],
      );

      if (requiredRoles && !requiredRoles.includes(payload.role)) {
        throw new UnauthorizedException('权限不足');
      }

      // 检查管理员角色权限
      const requiredAdminRoles = this.reflector.getAllAndOverride<AdminRole[]>(
        ADMIN_ROLES_KEY,
        [context.getHandler(), context.getClass()],
      );

      if (requiredAdminRoles && payload.role === UserRole.ADMIN) {
        // 获取管理员的详细角色信息
        const adminUser = await this.prisma.adminUser.findUnique({
          where: { id: payload.sub },
          select: { role: true },
        });

        if (
          !adminUser ||
          !requiredAdminRoles.includes(adminUser.role as AdminRole)
        ) {
          throw new UnauthorizedException('管理员权限不足');
        }
      } else if (requiredAdminRoles) {
        // 如果需要管理员权限但不是管理员
        throw new UnauthorizedException('需要管理员权限');
      }

      // 将用户信息附加到请求
      request.user = {
        id: user.id,
        role: payload.role,
        email: user.email || undefined,
        phone: user.phone || undefined,
        username: user.username || undefined,
      };

      return true;
    } catch (error) {
      // 如果是已知的认证异常，直接抛出
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      // JWT 验证失败的具体错误处理
      if (error instanceof Error) {
        if (error.name === 'TokenExpiredError') {
          throw new UnauthorizedException('认证令牌已过期');
        }

        if (error.name === 'JsonWebTokenError') {
          throw new UnauthorizedException('认证令牌格式无效');
        }
      }

      // 其他未知错误
      throw new UnauthorizedException('认证验证失败');
    }
  }

  private async getUserByRole(
    userId: string,
    role: UserRole,
  ): Promise<{
    id: string;
    email: string | null;
    phone: string | null;
    username: string | null;
  } | null> {
    switch (role) {
      case UserRole.ADMIN:
        return this.prisma.adminUser.findUnique({
          where: { id: userId, status: 'ACTIVE' },
        });
      case UserRole.MERCHANT:
        return this.prisma.merchantUser.findUnique({
          where: { id: userId, status: 'ACTIVE' },
        });
      case UserRole.CUSTOMER:
        return this.prisma.customerUser.findUnique({
          where: { id: userId, status: 'ACTIVE' },
        });
      default:
        return null;
    }
  }
}
