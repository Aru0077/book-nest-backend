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
 * 分页元数据 - 符合REST API最佳实践
 */
export interface PaginationMeta {
  /** 当前页码 (从1开始) */
  page: number;
  /** 每页条数 */
  size: number;
  /** 总条数 */
  total: number;
  /** 总页数 */
  totalPages: number;
  /** 是否有下一页 */
  hasNext: boolean;
  /** 是否有上一页 */
  hasPrevious: boolean;
  /** 当前页起始索引 (从0开始) */
  offset: number;
}

/**
 * 分页数据格式 - 符合REST API最佳实践
 */
export interface PaginatedData<T> {
  /** 数据列表 */
  items: T[];
  /** 分页元数据 */
  pagination: PaginationMeta;
}

/**
 * 分页查询参数 - 标准化分页请求
 */
export interface PaginationQuery {
  /** 页码 (默认1) */
  page?: number;
  /** 每页条数 (默认10, 最大100) */
  size?: number;
  /** 排序字段 */
  sortBy?: string;
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
}

/**
 * 分页响应格式
 */
export type ApiPaginatedResponse<T> = ApiSuccessResponse<PaginatedData<T>>;

/**
 * 通用API响应类型
 */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * 创建分页元数据的工具函数类型
 */
export type CreatePaginationMeta = (params: {
  page: number;
  size: number;
  total: number;
}) => PaginationMeta;
