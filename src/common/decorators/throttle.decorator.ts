/**
 * 自定义限流装饰器
 * 提供细粒度的请求频率控制
 */

import { applyDecorators } from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';

/**
 * 装饰器返回类型（与applyDecorators返回类型匹配）
 */
type DecoratorFunction = <TFunction extends (...args: unknown[]) => unknown, Y>(
  target: object | TFunction,
  propertyKey?: string | symbol,
  descriptor?: TypedPropertyDescriptor<Y>,
) => void;

/**
 * 认证接口限流（防暴力破解）
 * 5分钟内最多10次尝试
 */
export function AuthThrottle(): DecoratorFunction {
  return applyDecorators(
    SkipThrottle(), // 跳过全局限流
    Throttle({
      auth: { limit: 10, ttl: 300000 }, // 5分钟10次（防暴力破解）
      short: { limit: 2, ttl: 1000 }, // 1秒内最多2次（防快速点击）
      medium: { limit: 5, ttl: 10000 }, // 10秒内最多5次
    }),
  );
}

/**
 * 注册接口限流（防批量注册）
 * 限制更严格
 */
export function RegisterThrottle(): DecoratorFunction {
  return applyDecorators(
    SkipThrottle(), // 跳过全局限流
    Throttle({
      auth: { limit: 5, ttl: 300000 }, // 5分钟5次（防批量注册）
      short: { limit: 1, ttl: 1000 }, // 1秒内最多1次
      medium: { limit: 3, ttl: 60000 }, // 1分钟内最多3次
    }),
  );
}

/**
 * 自定义限流配置
 * @param config 限流配置对象
 */
export function CustomThrottle(config: {
  short?: { limit: number; ttl: number };
  medium?: { limit: number; ttl: number };
  long?: { limit: number; ttl: number };
  auth?: { limit: number; ttl: number };
}): DecoratorFunction {
  return applyDecorators(
    SkipThrottle(), // 跳过全局限流
    Throttle(config),
  );
}
