/**
 * BookNest API 统一响应格式类型定义
 * 符合REST API最佳实践和RFC 7807标准
 */

/**
 * 成功响应格式
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  code: number;
  message: string;
  timestamp: string;
}

/**
 * 错误响应格式
 */
export interface ApiErrorResponse {
  success: false;
  code: number;
  timestamp: string;
  path: string;
  method: string;
  message: string;
  error?: {
    name: string;
    stack?: string;
    [key: string]: unknown;
  };
}

/**
 * 通用API响应类型
 */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;
