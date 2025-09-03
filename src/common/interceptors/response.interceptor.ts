import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response as ExpressResponse } from 'express';

/**
 * BookNest API标准响应格式接口 - 符合REST API最佳实践
 */
export interface ApiResponse<T> {
  success: true; // 成功标识
  data: T; // 实际响应数据
  code: number; // HTTP状态码
  message: string; // 响应消息
  timestamp: string; // ISO格式时间戳
}

/**
 * BookNest 全局响应拦截器
 *
 * 统一包装所有成功响应的数据格式
 * 自动添加状态码、消息和时间戳信息
 *
 * @template T - 响应数据类型
 */
@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const response = context.switchToHttp().getResponse<ExpressResponse>();

    return next.handle().pipe(
      map((data: T) => ({
        success: true,
        data,
        code: response.statusCode,
        message: 'Request successful',
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
