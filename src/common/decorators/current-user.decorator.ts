/**
 * 当前用户装饰器
 * 用于在控制器方法中获取当前认证用户信息
 */

import {
  ExecutionContext,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthUser } from '@/modules/auth/auth.types';

/**
 * 当前用户装饰器 - 精简版
 * 从请求对象中提取已认证的用户信息
 */
export const CurrentUser = createParamDecorator(
  <K extends keyof AuthUser>(
    data: K | undefined,
    ctx: ExecutionContext,
  ): AuthUser | AuthUser[K] => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('用户信息未找到，请确保已通过认证');
    }

    if (data) {
      return user[data];
    }

    return user;
  },
);
