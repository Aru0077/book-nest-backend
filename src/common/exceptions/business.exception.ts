/**
 * 业务异常类
 * 统一的业务错误处理机制
 */

import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode, getErrorMessage } from '@/common/constants/error-codes';

/**
 * 业务异常类
 * 用于抛出具有明确错误码和消息的业务异常
 */
export class BusinessException extends HttpException {
  public readonly errorCode: ErrorCode;

  constructor(errorCode: ErrorCode, message?: string, httpStatus?: HttpStatus) {
    const errorMessage: string = message ?? getErrorMessage(errorCode);
    const status: HttpStatus =
      httpStatus ?? BusinessException.getHttpStatus(errorCode);

    super(
      {
        code: errorCode,
        message: errorMessage,
        timestamp: new Date().toISOString(),
      },
      status,
    );

    this.errorCode = errorCode;
  }

  /**
   * 根据错误码自动映射HTTP状态码
   */
  private static getHttpStatus(errorCode: ErrorCode): HttpStatus {
    // 认证相关错误
    if (
      errorCode >= ErrorCode.INVALID_TOKEN &&
      errorCode < ErrorCode.USER_NOT_FOUND
    ) {
      return HttpStatus.UNAUTHORIZED;
    }

    // 用户相关错误
    if (
      errorCode >= ErrorCode.USER_NOT_FOUND &&
      errorCode < ErrorCode.VALIDATION_FAILED
    ) {
      return HttpStatus.BAD_REQUEST;
    }

    // 验证相关错误
    if (
      errorCode >= ErrorCode.VALIDATION_FAILED &&
      errorCode < ErrorCode.RESOURCE_NOT_FOUND
    ) {
      return HttpStatus.BAD_REQUEST;
    }

    // 资源相关错误
    if (
      errorCode >= ErrorCode.RESOURCE_NOT_FOUND &&
      errorCode < ErrorCode.RATE_LIMIT_EXCEEDED
    ) {
      if (errorCode === ErrorCode.RESOURCE_NOT_FOUND) {
        return HttpStatus.NOT_FOUND;
      }
      if (errorCode === ErrorCode.RESOURCE_ACCESS_DENIED) {
        return HttpStatus.FORBIDDEN;
      }
      if (errorCode === ErrorCode.RESOURCE_ALREADY_EXISTS) {
        return HttpStatus.CONFLICT;
      }
      return HttpStatus.BAD_REQUEST;
    }

    // 限流相关错误
    if (
      errorCode >= ErrorCode.RATE_LIMIT_EXCEEDED &&
      errorCode < ErrorCode.INTERNAL_SERVER_ERROR
    ) {
      return HttpStatus.TOO_MANY_REQUESTS;
    }

    // 系统相关错误
    if (errorCode >= ErrorCode.INTERNAL_SERVER_ERROR) {
      return HttpStatus.INTERNAL_SERVER_ERROR;
    }

    // 默认返回400
    return HttpStatus.BAD_REQUEST;
  }
}

/**
 * 快速创建业务异常的工厂方法
 */
export class BusinessError {
  // 认证相关
  static invalidToken(message?: string): BusinessException {
    return new BusinessException(ErrorCode.INVALID_TOKEN, message);
  }

  static tokenExpired(message?: string): BusinessException {
    return new BusinessException(ErrorCode.TOKEN_EXPIRED, message);
  }

  static insufficientPermissions(message?: string): BusinessException {
    return new BusinessException(ErrorCode.INSUFFICIENT_PERMISSIONS, message);
  }

  static accountDisabled(message?: string): BusinessException {
    return new BusinessException(ErrorCode.ACCOUNT_DISABLED, message);
  }

  // 用户相关
  static userNotFound(message?: string): BusinessException {
    return new BusinessException(ErrorCode.USER_NOT_FOUND, message);
  }

  static userAlreadyExists(message?: string): BusinessException {
    return new BusinessException(ErrorCode.USER_ALREADY_EXISTS, message);
  }

  static invalidCredentials(message?: string): BusinessException {
    return new BusinessException(ErrorCode.INVALID_CREDENTIALS, message);
  }

  static emailAlreadyExists(message?: string): BusinessException {
    return new BusinessException(ErrorCode.EMAIL_ALREADY_EXISTS, message);
  }

  static phoneAlreadyExists(message?: string): BusinessException {
    return new BusinessException(ErrorCode.PHONE_ALREADY_EXISTS, message);
  }

  static usernameAlreadyExists(message?: string): BusinessException {
    return new BusinessException(ErrorCode.USER_ALREADY_EXISTS, message);
  }

  static weakPassword(message?: string): BusinessException {
    return new BusinessException(ErrorCode.WEAK_PASSWORD, message);
  }

  static missingContactInfo(message?: string): BusinessException {
    return new BusinessException(ErrorCode.MISSING_REQUIRED_FIELD, message);
  }

  // 管理员相关
  static adminApplicationNotFound(message?: string): BusinessException {
    return new BusinessException(
      ErrorCode.ADMIN_APPLICATION_NOT_FOUND,
      message,
    );
  }

  static adminApplicationNotPending(message?: string): BusinessException {
    return new BusinessException(
      ErrorCode.ADMIN_APPLICATION_NOT_PENDING,
      message,
    );
  }

  static superAdminRequired(message?: string): BusinessException {
    return new BusinessException(ErrorCode.SUPER_ADMIN_REQUIRED, message);
  }

  // 验证相关
  static validationFailed(message?: string): BusinessException {
    return new BusinessException(ErrorCode.VALIDATION_FAILED, message);
  }

  static inputTooLarge(message?: string): BusinessException {
    return new BusinessException(ErrorCode.INVALID_INPUT_FORMAT, message);
  }

  // 资源相关
  static resourceNotFound(message?: string): BusinessException {
    return new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, message);
  }

  static resourceAccessDenied(message?: string): BusinessException {
    return new BusinessException(ErrorCode.RESOURCE_ACCESS_DENIED, message);
  }

  // 系统相关
  static databaseError(message?: string): BusinessException {
    return new BusinessException(ErrorCode.DATABASE_ERROR, message);
  }

  static redisError(message?: string): BusinessException {
    return new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR, message);
  }
}
