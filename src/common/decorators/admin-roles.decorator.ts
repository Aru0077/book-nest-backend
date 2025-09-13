/**
 * 管理员角色权限装饰器
 * 用于控制器方法的管理员角色访问控制
 */

import { SetMetadata } from '@nestjs/common';
import { AdminRole } from '@/modules/auth/auth.types';

/**
 * 管理员角色装饰器元数据键
 */
export const ADMIN_ROLES_KEY = 'adminRoles';

/**
 * 管理员角色装饰器
 * 用于指定接口允许访问的管理员角色
 *
 * @param roles 允许访问的管理员角色数组
 *
 * @example
 * ```typescript
 * @AdminRoles(AdminRole.SUPER_ADMIN)
 * @Get('super-admin-only')
 * superAdminOnlyEndpoint() {
 *   return { message: '只有超级管理员可以访问' };
 * }
 *
 * @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
 * @Get('all-admin')
 * allAdminEndpoint() {
 *   return { message: '所有管理员可以访问' };
 * }
 * ```
 */
export const AdminRoles = (
  ...roles: AdminRole[]
): ClassDecorator & MethodDecorator => SetMetadata(ADMIN_ROLES_KEY, roles);

/**
 * 超级管理员专用装饰器
 */
export const SuperAdminOnly = (): ClassDecorator & MethodDecorator =>
  AdminRoles(AdminRole.SUPER_ADMIN);

/**
 * 所有管理员装饰器（超级管理员和普通管理员）
 */
export const AllAdmins = (): ClassDecorator & MethodDecorator =>
  AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN);
