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
import { BaseAuthService } from '../services/base-auth.service';

/**
 * 全局JWT认证守卫
 * 负责验证用户身份、检查权限、管理缓存等认证相关逻辑
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService, // JWT令牌服务
    private reflector: Reflector, // 元数据反射服务
    private baseAuthService: BaseAuthService, // 基础认证服务
  ) {}

  /**
   * 认证守卫核心逻辑
   * 1. 检查是否为公开接口
   * 2. 验证JWT令牌有效性
   * 3. 检查用户权限和状态
   * 4. 将用户信息附加到请求对象
   * @param context 执行上下文
   * @returns 是否允许访问
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 检查接口是否被 @Public() 装饰器标记为公开接口
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(), // 方法级元数据
      context.getClass(), // 类级元数据
    ]);

    // 公开接口无需认证，直接通过
    if (isPublic) {
      return true;
    }

    // 获取HTTP请求对象
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    const authHeader = request.headers.authorization;

    // 检查Authorization请求头是否存在且格式正确
    if (
      !authHeader ||
      typeof authHeader !== 'string' ||
      !authHeader.startsWith('Bearer ')
    ) {
      throw new UnauthorizedException('缺少认证令牌');
    }

    // 提取JWT令牌(去除'Bearer '前缀)
    const token = authHeader.substring(7);

    try {
      // 验证JWT令牌的签名和过期时间
      const payload: JwtPayload = this.jwtService.verify(token);

      // 从 Redis 缓存中获取用户信息(高性能：避免频繁数据库查询)
      const user = await this.baseAuthService.getUserFromCache(
        payload.sub, // 用户ID
        payload.role, // 用户角色
      );
      if (!user) {
        throw new UnauthorizedException('用户不存在或已被禁用');
      }

      // 检查基础角色权限(@Roles 装饰器)
      const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
        ROLES_KEY,
        [context.getHandler(), context.getClass()],
      );

      if (requiredRoles && !requiredRoles.includes(payload.role)) {
        throw new UnauthorizedException('权限不足');
      }

      // 检查管理员级别权限(@AdminRoles 装饰器)
      const requiredAdminRoles = this.reflector.getAllAndOverride<AdminRole[]>(
        ADMIN_ROLES_KEY,
        [context.getHandler(), context.getClass()],
      );

      if (requiredAdminRoles && payload.role === UserRole.ADMIN) {
        // 对于管理员用户，检查具体的管理员角色权限(从缓存中获取)
        if (!user.adminRole || !requiredAdminRoles.includes(user.adminRole)) {
          throw new UnauthorizedException('管理员权限不足');
        }
      } else if (requiredAdminRoles) {
        // 如果接口需要管理员权限但当前用户不是管理员
        throw new UnauthorizedException('需要管理员权限');
      }

      // 将验证通过的用户信息附加到请求对象，供控制器使用
      request.user = {
        id: user.id,
        role: payload.role,
        email: user.email || undefined,
        phone: user.phone || undefined,
      };

      return true; // 认证成功，允许访问
    } catch (error) {
      // 保持已知的认证异常不被覆盖
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      // JWT 库特定错误的精确处理
      if (error instanceof Error) {
        if (error.name === 'TokenExpiredError') {
          throw new UnauthorizedException('认证令牌已过期');
        }

        if (error.name === 'JsonWebTokenError') {
          throw new UnauthorizedException('认证令牌格式无效');
        }
      }

      // 其他未知错误统一归类为认证失败
      throw new UnauthorizedException('认证验证失败');
    }
  }
}
