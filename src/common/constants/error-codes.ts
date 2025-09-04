/**
 * 统一错误码定义
 * 按业务模块分类，便于维护和扩展
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
  TOKEN_MALFORMED = 1003,
  REFRESH_TOKEN_INVALID = 1004,
  REFRESH_TOKEN_EXPIRED = 1005,
  INSUFFICIENT_PERMISSIONS = 1006,
  ACCOUNT_DISABLED = 1007,
  ACCOUNT_PENDING_APPROVAL = 1008,
  ACCOUNT_REJECTED = 1009,

  // ========================================
  // 用户相关错误 2000-2999
  // ========================================
  USER_NOT_FOUND = 2001,
  USER_ALREADY_EXISTS = 2002,
  INVALID_CREDENTIALS = 2003,
  EMAIL_ALREADY_EXISTS = 2004,
  PHONE_ALREADY_EXISTS = 2005,
  USERNAME_ALREADY_EXISTS = 2006,
  WEAK_PASSWORD = 2007,
  PASSWORD_REUSED = 2008,
  INVALID_EMAIL_FORMAT = 2009,
  INVALID_PHONE_FORMAT = 2010,
  MISSING_CONTACT_INFO = 2011,

  // ========================================
  // 管理员相关错误 2100-2199
  // ========================================
  ADMIN_APPLICATION_NOT_FOUND = 2101,
  ADMIN_APPLICATION_NOT_PENDING = 2102,
  SUPER_ADMIN_REQUIRED = 2103,
  ADMIN_APPROVAL_FAILED = 2104,

  // ========================================
  // 验证相关错误 3000-3999
  // ========================================
  VALIDATION_FAILED = 3001,
  INVALID_INPUT_FORMAT = 3002,
  MISSING_REQUIRED_FIELD = 3003,
  INPUT_TOO_LARGE = 3004,
  INVALID_PARAMETER = 3005,

  // ========================================
  // 业务资源错误 4000-4999
  // ========================================
  RESOURCE_NOT_FOUND = 4001,
  RESOURCE_ALREADY_EXISTS = 4002,
  RESOURCE_ACCESS_DENIED = 4003,
  RESOURCE_CONFLICT = 4004,

  // ========================================
  // 限流相关错误 5000-5099
  // ========================================
  RATE_LIMIT_EXCEEDED = 5001,
  TOO_MANY_REQUESTS = 5002,
  CONCURRENT_LIMIT_EXCEEDED = 5003,

  // ========================================
  // 系统相关错误 9000-9999
  // ========================================
  INTERNAL_SERVER_ERROR = 9001,
  DATABASE_ERROR = 9002,
  REDIS_ERROR = 9003,
  EXTERNAL_SERVICE_ERROR = 9004,
  CONFIGURATION_ERROR = 9005,
  NETWORK_ERROR = 9006,
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
  [ErrorCode.TOKEN_MALFORMED]: '访问令牌格式错误',
  [ErrorCode.REFRESH_TOKEN_INVALID]: '刷新令牌无效',
  [ErrorCode.REFRESH_TOKEN_EXPIRED]: '刷新令牌已过期',
  [ErrorCode.INSUFFICIENT_PERMISSIONS]: '权限不足',
  [ErrorCode.ACCOUNT_DISABLED]: '账户已被禁用',
  [ErrorCode.ACCOUNT_PENDING_APPROVAL]: '账户待审批',
  [ErrorCode.ACCOUNT_REJECTED]: '账户申请已被拒绝',

  // 用户相关
  [ErrorCode.USER_NOT_FOUND]: '用户不存在',
  [ErrorCode.USER_ALREADY_EXISTS]: '用户已存在',
  [ErrorCode.INVALID_CREDENTIALS]: '用户名或密码错误',
  [ErrorCode.EMAIL_ALREADY_EXISTS]: '邮箱已被注册',
  [ErrorCode.PHONE_ALREADY_EXISTS]: '手机号已被注册',
  [ErrorCode.USERNAME_ALREADY_EXISTS]: '用户名已被注册',
  [ErrorCode.WEAK_PASSWORD]: '密码强度不足',
  [ErrorCode.PASSWORD_REUSED]: '不能使用最近使用过的密码',
  [ErrorCode.INVALID_EMAIL_FORMAT]: '邮箱格式不正确',
  [ErrorCode.INVALID_PHONE_FORMAT]: '手机号格式不正确',
  [ErrorCode.MISSING_CONTACT_INFO]: '至少提供一个联系方式',

  // 管理员相关
  [ErrorCode.ADMIN_APPLICATION_NOT_FOUND]: '管理员申请不存在',
  [ErrorCode.ADMIN_APPLICATION_NOT_PENDING]: '该管理员申请状态不是待审批',
  [ErrorCode.SUPER_ADMIN_REQUIRED]: '需要超级管理员权限',
  [ErrorCode.ADMIN_APPROVAL_FAILED]: '管理员审批失败',

  // 验证相关
  [ErrorCode.VALIDATION_FAILED]: '数据验证失败',
  [ErrorCode.INVALID_INPUT_FORMAT]: '输入格式无效',
  [ErrorCode.MISSING_REQUIRED_FIELD]: '缺少必填字段',
  [ErrorCode.INPUT_TOO_LARGE]: '输入数据过大',
  [ErrorCode.INVALID_PARAMETER]: '无效的参数',

  // 业务资源
  [ErrorCode.RESOURCE_NOT_FOUND]: '资源不存在',
  [ErrorCode.RESOURCE_ALREADY_EXISTS]: '资源已存在',
  [ErrorCode.RESOURCE_ACCESS_DENIED]: '资源访问被拒绝',
  [ErrorCode.RESOURCE_CONFLICT]: '资源冲突',

  // 限流相关
  [ErrorCode.RATE_LIMIT_EXCEEDED]: '请求频率超过限制',
  [ErrorCode.TOO_MANY_REQUESTS]: '请求过于频繁，请稍后重试',
  [ErrorCode.CONCURRENT_LIMIT_EXCEEDED]: '并发连接数超过限制',

  // 系统相关
  [ErrorCode.INTERNAL_SERVER_ERROR]: '服务器内部错误',
  [ErrorCode.DATABASE_ERROR]: '数据库错误',
  [ErrorCode.REDIS_ERROR]: 'Redis缓存错误',
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: '外部服务错误',
  [ErrorCode.CONFIGURATION_ERROR]: '配置错误',
  [ErrorCode.NETWORK_ERROR]: '网络错误',
};

/**
 * 根据错误码获取默认错误消息
 */
export function getErrorMessage(code: ErrorCode): string {
  return ErrorMessages[code] || ErrorMessages[ErrorCode.UNKNOWN_ERROR];
}

/**
 * 检查是否为用户错误（4xx）
 */
export function isUserError(code: ErrorCode): boolean {
  return (
    code >= ErrorCode.INVALID_TOKEN && code < ErrorCode.INTERNAL_SERVER_ERROR
  );
}

/**
 * 检查是否为系统错误（5xx）
 */
export function isSystemError(code: ErrorCode): boolean {
  return code >= ErrorCode.INTERNAL_SERVER_ERROR;
}
