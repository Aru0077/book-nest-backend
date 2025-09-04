/**
 * 统一错误码定义
 * 精简版：保留25个核心错误码，专为酒店预订平台优化
 */

export enum ErrorCode {
  // ========================================
  // 通用错误 0-999
  // ========================================
  SUCCESS = 0,
  UNKNOWN_ERROR = 999,

  // ========================================
  // 认证相关错误 1000-1999
  // ========================================
  INVALID_TOKEN = 1001,
  TOKEN_EXPIRED = 1002,
  REFRESH_TOKEN_INVALID = 1004,
  REFRESH_TOKEN_EXPIRED = 1005,
  INSUFFICIENT_PERMISSIONS = 1006,
  ACCOUNT_DISABLED = 1007,
  ACCOUNT_PENDING_APPROVAL = 1008,

  // ========================================
  // 用户相关错误 2000-2999
  // ========================================
  USER_NOT_FOUND = 2001,
  USER_ALREADY_EXISTS = 2002,
  INVALID_CREDENTIALS = 2003,
  EMAIL_ALREADY_EXISTS = 2004,
  PHONE_ALREADY_EXISTS = 2005,
  WEAK_PASSWORD = 2007,
  INVALID_CONTACT_FORMAT = 2009, // 合并邮箱和手机格式错误

  // ========================================
  // 管理员相关错误 2100-2199
  // ========================================
  ADMIN_APPLICATION_NOT_FOUND = 2101,
  ADMIN_APPLICATION_NOT_PENDING = 2102,
  SUPER_ADMIN_REQUIRED = 2103,

  // ========================================
  // 验证相关错误 3000-3999
  // ========================================
  VALIDATION_FAILED = 3001,
  INVALID_INPUT_FORMAT = 3002,
  MISSING_REQUIRED_FIELD = 3003,

  // ========================================
  // 业务资源错误 4000-4999
  // ========================================
  RESOURCE_NOT_FOUND = 4001,
  RESOURCE_ALREADY_EXISTS = 4002,
  RESOURCE_ACCESS_DENIED = 4003,

  // ========================================
  // 限流相关错误 5000-5099
  // ========================================
  RATE_LIMIT_EXCEEDED = 5001,

  // ========================================
  // 系统相关错误 9000-9999
  // ========================================
  INTERNAL_SERVER_ERROR = 9001,
  DATABASE_ERROR = 9002,
}

/**
 * 错误码对应的默认错误消息
 */
export const ErrorMessages: Record<ErrorCode, string> = {
  [ErrorCode.SUCCESS]: '操作成功',
  [ErrorCode.UNKNOWN_ERROR]: '未知错误',

  // 认证相关
  [ErrorCode.INVALID_TOKEN]: '无效的访问令牌',
  [ErrorCode.TOKEN_EXPIRED]: '访问令牌已过期',
  [ErrorCode.REFRESH_TOKEN_INVALID]: '刷新令牌无效',
  [ErrorCode.REFRESH_TOKEN_EXPIRED]: '刷新令牌已过期',
  [ErrorCode.INSUFFICIENT_PERMISSIONS]: '权限不足',
  [ErrorCode.ACCOUNT_DISABLED]: '账户已被禁用',
  [ErrorCode.ACCOUNT_PENDING_APPROVAL]: '账户待审批',

  // 用户相关
  [ErrorCode.USER_NOT_FOUND]: '用户不存在',
  [ErrorCode.USER_ALREADY_EXISTS]: '用户已存在',
  [ErrorCode.INVALID_CREDENTIALS]: '用户名或密码错误',
  [ErrorCode.EMAIL_ALREADY_EXISTS]: '邮箱已被使用',
  [ErrorCode.PHONE_ALREADY_EXISTS]: '手机号已被使用',
  [ErrorCode.WEAK_PASSWORD]: '密码强度不够',
  [ErrorCode.INVALID_CONTACT_FORMAT]: '邮箱或手机号格式不正确',

  // 管理员相关
  [ErrorCode.ADMIN_APPLICATION_NOT_FOUND]: '管理员申请不存在',
  [ErrorCode.ADMIN_APPLICATION_NOT_PENDING]: '管理员申请状态不是待审批',
  [ErrorCode.SUPER_ADMIN_REQUIRED]: '需要超级管理员权限',

  // 验证相关
  [ErrorCode.VALIDATION_FAILED]: '输入验证失败',
  [ErrorCode.INVALID_INPUT_FORMAT]: '输入格式不正确',
  [ErrorCode.MISSING_REQUIRED_FIELD]: '缺少必填字段',

  // 业务资源相关
  [ErrorCode.RESOURCE_NOT_FOUND]: '资源不存在',
  [ErrorCode.RESOURCE_ALREADY_EXISTS]: '资源已存在',
  [ErrorCode.RESOURCE_ACCESS_DENIED]: '无权访问该资源',

  // 限流相关
  [ErrorCode.RATE_LIMIT_EXCEEDED]: '请求频率超过限制',

  // 系统相关
  [ErrorCode.INTERNAL_SERVER_ERROR]: '服务器内部错误',
  [ErrorCode.DATABASE_ERROR]: '数据库操作错误',
};

/**
 * 获取错误码对应的错误消息
 * @param errorCode 错误码
 * @returns 错误消息
 */
export function getErrorMessage(errorCode: ErrorCode): string {
  return ErrorMessages[errorCode] || ErrorMessages[ErrorCode.UNKNOWN_ERROR];
}
