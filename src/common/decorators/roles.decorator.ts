/**
 * 角色权限装饰器
 * 用于控制器方法的角色访问控制
 */

import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@/modules/auth/auth.types';

/**
 * 角色装饰器元数据键
 */
export const ROLES_KEY = 'roles';

/**
 * 角色装饰器
 * 用于指定接口允许访问的用户角色
 *
 * @param roles 允许访问的用户角色数组
 *
 * @example
 * ```typescript
 * @Roles(UserRole.ADMIN)
 * @Get('admin-only')
 * adminOnlyEndpoint() {
 *   return { message: '只有管理员可以访问' };
 * }
 *
 * @Roles(UserRole.ADMIN, UserRole.MERCHANT)
 * @Get('admin-or-merchant')
 * adminOrMerchantEndpoint() {
 *   return { message: '管理员或商家可以访问' };
 * }
 * ```
 */
export const Roles = (...roles: UserRole[]): ClassDecorator & MethodDecorator =>
  SetMetadata(ROLES_KEY, roles);

/**
 * 管理员专用装饰器
 */
export const AdminOnly = (): ClassDecorator & MethodDecorator =>
  Roles(UserRole.ADMIN);

/**
 * 商家专用装饰器
 */
export const MerchantOnly = (): ClassDecorator & MethodDecorator =>
  Roles(UserRole.MERCHANT);

/**
 * 客户专用装饰器
 */
export const CustomerOnly = (): ClassDecorator & MethodDecorator =>
  Roles(UserRole.CUSTOMER);

/**
 * 管理员和商家装饰器
 */
export const AdminOrMerchant = (): ClassDecorator & MethodDecorator =>
  Roles(UserRole.ADMIN, UserRole.MERCHANT);

/**
 * 商家和客户装饰器
 */
export const MerchantOrCustomer = (): ClassDecorator & MethodDecorator =>
  Roles(UserRole.MERCHANT, UserRole.CUSTOMER);
