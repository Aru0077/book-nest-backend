/**
 * 公开接口装饰器
 * 用于标记不需要认证的接口
 */

import { SetMetadata } from '@nestjs/common';

/**
 * 公开接口元数据键
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * 公开接口装饰器
 * 标记控制器方法或整个控制器为公开访问，不需要认证
 *
 * @example
 * ```typescript
 * @Public()
 * @Get('public-endpoint')
 * publicEndpoint() {
 *   return { message: '公开接口，无需认证' };
 * }
 * ```
 */
export const Public = (): MethodDecorator & ClassDecorator =>
  SetMetadata(IS_PUBLIC_KEY, true);
