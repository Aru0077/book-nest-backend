/**
 * 自定义限流装饰器
 * 提供细粒度的请求频率控制
 */

import { applyDecorators } from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';

// Type for method decorator
type MethodDecorator<T = unknown> = (
  target: unknown,
  propertyKey?: string | symbol,
  descriptor?: TypedPropertyDescriptor<T>,
) => void;

/**
 * 认证接口限流（防暴力破解）
 * 5分钟内最多10次尝试
 */
export function AuthThrottle(): MethodDecorator {
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
export function RegisterThrottle(): MethodDecorator {
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
 * 敏感操作限流（如密码重置、账户修改）
 */
export function SensitiveOperationThrottle(): MethodDecorator {
  return applyDecorators(
    SkipThrottle(), // 跳过全局限流
    Throttle({
      short: { limit: 1, ttl: 2000 }, // 2秒内最多1次
      medium: { limit: 3, ttl: 60000 }, // 1分钟内最多3次
      long: { limit: 10, ttl: 3600000 }, // 1小时内最多10次
    }),
  );
}

/**
 * 查询接口限流（正常使用频率）
 */
export function QueryThrottle(): MethodDecorator {
  return applyDecorators(
    SkipThrottle(), // 跳过全局限流
    Throttle({
      short: { limit: 5, ttl: 1000 }, // 1秒内最多5次
      medium: { limit: 30, ttl: 10000 }, // 10秒内最多30次
      long: { limit: 200, ttl: 60000 }, // 1分钟内最多200次
    }),
  );
}

/**
 * 搜索接口限流（防恶意搜索）
 */
export function SearchThrottle(): MethodDecorator {
  return applyDecorators(
    SkipThrottle(), // 跳过全局限流
    Throttle({
      short: { limit: 2, ttl: 1000 }, // 1秒内最多2次
      medium: { limit: 10, ttl: 10000 }, // 10秒内最多10次
      long: { limit: 50, ttl: 60000 }, // 1分钟内最多50次
    }),
  );
}

/**
 * 文件上传限流
 */
export function UploadThrottle(): MethodDecorator {
  return applyDecorators(
    SkipThrottle(), // 跳过全局限流
    Throttle({
      short: { limit: 1, ttl: 2000 }, // 2秒内最多1次
      medium: { limit: 5, ttl: 60000 }, // 1分钟内最多5次
      long: { limit: 20, ttl: 3600000 }, // 1小时内最多20次
    }),
  );
}

/**
 * 批量操作限流
 */
export function BatchOperationThrottle(): MethodDecorator {
  return applyDecorators(
    SkipThrottle(), // 跳过全局限流
    Throttle({
      short: { limit: 1, ttl: 5000 }, // 5秒内最多1次
      medium: { limit: 3, ttl: 60000 }, // 1分钟内最多3次
      long: { limit: 10, ttl: 3600000 }, // 1小时内最多10次
    }),
  );
}

/**
 * 管理员操作限流（相对宽松）
 */
export function AdminOperationThrottle(): MethodDecorator {
  return applyDecorators(
    SkipThrottle(), // 跳过全局限流
    Throttle({
      short: { limit: 10, ttl: 1000 }, // 1秒内最多10次
      medium: { limit: 50, ttl: 10000 }, // 10秒内最多50次
      long: { limit: 500, ttl: 60000 }, // 1分钟内最多500次
    }),
  );
}

/**
 * 健康检查限流（允许高频访问）
 */
export function HealthCheckThrottle(): MethodDecorator {
  return applyDecorators(
    SkipThrottle(), // 跳过全局限流
    Throttle({
      short: { limit: 10, ttl: 1000 }, // 1秒内最多10次
      medium: { limit: 100, ttl: 10000 }, // 10秒内最多100次
      long: { limit: 600, ttl: 60000 }, // 1分钟内最多600次
    }),
  );
}

/**
 * 公开API限流（严格控制）
 */
export function PublicApiThrottle(): MethodDecorator {
  return applyDecorators(
    SkipThrottle(), // 跳过全局限流
    Throttle({
      short: { limit: 2, ttl: 1000 }, // 1秒内最多2次
      medium: { limit: 10, ttl: 10000 }, // 10秒内最多10次
      long: { limit: 50, ttl: 60000 }, // 1分钟内最多50次
    }),
  );
}

/**
 * 无限流装饰器（用于内部调用）
 */
export function NoThrottle(): MethodDecorator {
  return SkipThrottle();
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
}): MethodDecorator {
  return applyDecorators(
    SkipThrottle(), // 跳过全局限流
    Throttle(config),
  );
}

// 使用示例注释：
/*
// 在控制器中使用
@Controller('auth')
export class AuthController {
  
  @Post('login')
  @AuthThrottle()  // 应用认证限流
  async login(@Body() loginDto: LoginDto) {
    // ...
  }

  @Post('register')
  @RegisterThrottle()  // 应用注册限流
  async register(@Body() registerDto: RegisterDto) {
    // ...
  }

  @Get('profile')
  @QueryThrottle()  // 应用查询限流
  async getProfile() {
    // ...
  }

  @Put('sensitive-operation')
  @SensitiveOperationThrottle()  // 应用敏感操作限流
  async sensitiveOperation() {
    // ...
  }

  @Post('custom')
  @CustomThrottle({
    short: { limit: 1, ttl: 1000 },
    medium: { limit: 5, ttl: 60000 }
  })
  async customOperation() {
    // ...
  }
}
*/
