import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * BookNest 全局异常过滤器 - 符合REST API最佳实践
 *
 * 统一处理所有异常并返回标准格式的错误响应
 * 参考RFC 7807标准和REST API最佳实践
 *
 * 错误响应格式:
 * {
 *   success: false,      // 失败标识
 *   code: number,        // HTTP状态码
 *   timestamp: string,   // ISO时间戳
 *   path: string,       // 请求路径
 *   method: string,     // HTTP方法
 *   message: string,    // 用户友好的错误消息
 *   error?: any,        // 详细错误信息(开发环境)
 * }
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = this.getHttpStatus(exception);
    const message = this.getErrorMessage(exception);

    const errorResponse = {
      success: false,
      code: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      ...(process.env.NODE_ENV === 'development' && {
        error:
          exception instanceof Error
            ? { name: exception.name, stack: exception.stack }
            : exception,
      }),
    };

    // 记录错误日志
    this.logError(exception, request, status);

    response.status(status).json(errorResponse);
  }

  /**
   * 获取HTTP状态码
   */
  private getHttpStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  /**
   * 获取错误消息
   */
  private getErrorMessage(exception: unknown): string {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();

      if (typeof response === 'string') {
        return response;
      }

      if (typeof response === 'object' && response !== null) {
        const responseObj = response as Record<string, unknown>;

        // 处理验证错误消息数组
        if (Array.isArray(responseObj.message)) {
          return (responseObj.message as string[]).join(', ');
        }

        if (typeof responseObj.message === 'string') {
          return responseObj.message;
        }
      }
    }

    if (exception instanceof Error) {
      return exception.message;
    }

    return 'Internal server error';
  }

  /**
   * 记录错误日志
   */
  private logError(exception: unknown, request: Request, status: number): void {
    const errorMessage = `${request.method} ${request.url} - ${status}`;

    if (status >= 500) {
      // 服务器错误 - 记录完整错误信息和堆栈
      this.logger.error(
        errorMessage,
        exception instanceof Error ? exception.stack : exception,
      );
    } else if (status >= 400) {
      // 客户端错误 - 记录警告
      this.logger.warn(
        `${errorMessage} - ${exception instanceof Error ? exception.message : String(exception)}`,
      );
    }
  }
}
