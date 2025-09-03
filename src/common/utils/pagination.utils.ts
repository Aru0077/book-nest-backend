/**
 * 分页工具函数 - 符合REST API最佳实践
 */

import { PaginatedData, PaginationMeta } from '@/common/types';

/**
 * 创建分页元数据
 */
export function createPaginationMeta(params: {
  page: number;
  size: number;
  total: number;
}): PaginationMeta {
  const { page, size, total } = params;

  const totalPages = Math.ceil(total / size);
  const offset = (page - 1) * size;

  return {
    page,
    size,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1,
    offset,
  };
}

/**
 * 创建分页响应数据
 */
export function createPaginatedData<T>(
  items: T[],
  pagination: PaginationMeta,
): PaginatedData<T> {
  return {
    items,
    pagination,
  };
}

/**
 * 验证分页参数
 */
export function validatePaginationQuery(query: {
  page?: number;
  size?: number;
}): { page: number; size: number } {
  const page = Math.max(1, Math.floor(query.page || 1));
  const size = Math.min(100, Math.max(1, Math.floor(query.size || 10)));

  return { page, size };
}

/**
 * 计算数据库查询的skip和take参数
 */
export function calculateOffset(
  page: number,
  size: number,
): {
  skip: number;
  take: number;
} {
  return {
    skip: (page - 1) * size,
    take: size,
  };
}
