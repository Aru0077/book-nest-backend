/**
 * 认证相关类型定义 - 精简版
 */

// 用户角色
export enum UserRole {
  ADMIN = 'admin',
  MERCHANT = 'merchant',
  CUSTOMER = 'customer',
}

// 管理员角色
export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
}

// 管理员状态
export enum AdminStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  REJECTED = 'REJECTED',
}

// JWT载荷
export interface JwtPayload {
  sub: string; // 用户ID
  role: UserRole;
  email?: string;
  iat?: number;
  exp?: number;
}

// 刷新令牌载荷
export interface RefreshTokenPayload extends JwtPayload {
  type: 'refresh';
}

// 登录凭证
export interface LoginDto {
  identifier: string; // 邮箱/手机号/用户名
  password: string;
}

// 注册数据
export interface RegisterDto {
  email?: string;
  phone?: string;
  username?: string;
  password: string;
}

// 认证用户信息
export interface AuthUser {
  id: string;
  role: UserRole;
  email?: string;
  phone?: string;
  username?: string;
}

// 登录响应
export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

// Request扩展
export interface AuthRequest extends Request {
  user: AuthUser;
}

// 管理员注册数据
export interface AdminRegisterDto {
  email?: string;
  phone?: string;
  username?: string;
  password: string;
}

// 管理员审批数据
export interface AdminApprovalDto {
  adminId: string;
  rejectedReason?: string;
}

// 管理员信息（包含状态和角色）
export interface AdminInfo {
  id: string;
  role: AdminRole;
  status: AdminStatus;
  email?: string;
  phone?: string;
  username?: string;
  appliedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  rejectedReason?: string;
}

// 待审批管理员列表项
export interface PendingAdminItem {
  id: string;
  email?: string;
  phone?: string;
  username?: string;
  appliedAt: Date;
}

// 刷新令牌DTO
export interface RefreshTokenDto {
  refreshToken: string;
}

// 刷新令牌响应
export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

// 缓存用户数据类型
export interface CachedUser {
  id: string;
  role: UserRole;
  email: string | null;
  phone: string | null;
  username: string | null;
  status: string;
  adminRole?: AdminRole; // 仅管理员有此字段
}
