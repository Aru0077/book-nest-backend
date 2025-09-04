/**
 * 输入验证装饰器
 * 提供各种安全的输入验证规则
 */

import { applyDecorators } from '@nestjs/common';
import {
  IsInt,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
} from 'class-validator';

/**
 * 安全的字符串验证（防XSS）
 */
export function IsSafeString(
  minLength = 1,
  maxLength = 255,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return applyDecorators(
    IsString({ message: '必须是字符串' }),
    MinLength(minLength, { message: `最少${minLength}个字符` }),
    MaxLength(maxLength, { message: `最多${maxLength}个字符` }),
    // 禁止潜在的XSS字符
    Matches(/^[^<>&"']*$/, {
      message: '包含非法字符，不允许使用 < > & " \' 字符',
    }),
    IsNoSqlInjection(validationOptions),
  );
}

/**
 * 文本内容验证（允许更多字符，但仍然安全）
 */
export function IsSafeText(
  maxLength = 5000,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return applyDecorators(
    IsString({ message: '必须是字符串' }),
    MaxLength(maxLength, { message: `内容长度不能超过${maxLength}个字符` }),
    // 允许基本的文本字符，但禁止危险的脚本标签
    Matches(/^(?!.*<script)(?!.*javascript:)(?!.*onclick)(?!.*onerror).*$/i, {
      message: '内容包含潜在的安全风险',
    }),
    IsNoSqlInjection(validationOptions),
  );
}

/**
 * ID验证（通常是数据库ID或UUID格式）
 */
export function IsValidId(
  _validationOptions?: ValidationOptions,
): PropertyDecorator {
  return applyDecorators(
    IsString({ message: 'ID必须是字符串' }),
    MinLength(1, { message: 'ID不能为空' }),
    MaxLength(50, { message: 'ID长度过长' }),
    // 允许字母、数字、连字符、下划线
    Matches(/^[a-zA-Z0-9_-]+$/, {
      message: 'ID格式不正确，只允许字母、数字、连字符和下划线',
    }),
  );
}

/**
 * 分页参数验证
 */
export function IsPageNumber(
  _validationOptions?: ValidationOptions,
): PropertyDecorator {
  return applyDecorators(
    IsInt({ message: '页码必须是整数' }),
    Min(1, { message: '页码不能小于1' }),
    Max(10000, { message: '页码不能超过10000' }),
  );
}

export function IsPageSize(
  _validationOptions?: ValidationOptions,
): PropertyDecorator {
  return applyDecorators(
    IsInt({ message: '每页大小必须是整数' }),
    Min(1, { message: '每页至少显示1条记录' }),
    Max(100, { message: '每页最多显示100条记录' }),
  );
}

/**
 * 搜索关键词验证
 */
export function IsSearchKeyword(
  maxLength = 100,
  _validationOptions?: ValidationOptions,
): PropertyDecorator {
  return applyDecorators(
    IsString({ message: '搜索关键词必须是字符串' }),
    MinLength(1, { message: '搜索关键词不能为空' }),
    MaxLength(maxLength, {
      message: `搜索关键词长度不能超过${maxLength}个字符`,
    }),
    // 允许中文、英文、数字、空格、基本标点
    Matches(/^[\u4e00-\u9fa5a-zA-Z0-9\s.,!?，。！？、]+$/, {
      message: '搜索关键词包含非法字符',
    }),
  );
}

/**
 * 排序字段验证
 */
export function IsSortField(
  allowedFields: string[],
  _validationOptions?: ValidationOptions,
): PropertyDecorator {
  return function (object: object, propertyName: string | symbol): void {
    const propName = propertyName.toString();
    registerDecorator({
      target: object.constructor,
      propertyName: propName,
      options: _validationOptions,
      constraints: [allowedFields],
      validator: {
        validate(value: string, args: ValidationArguments): boolean {
          const [relatedPropertyName] = args.constraints as [string[]];
          return relatedPropertyName.includes(value);
        },
        defaultMessage(args: ValidationArguments): string {
          const [relatedPropertyName] = args.constraints as [string[]];
          return `排序字段必须是以下之一: ${relatedPropertyName.join(', ')}`;
        },
      },
    });
  };
}

/**
 * 排序方向验证
 */
export function IsSortOrder(
  _validationOptions?: ValidationOptions,
): PropertyDecorator {
  return applyDecorators(
    IsString({ message: '排序方向必须是字符串' }),
    Matches(/^(asc|desc)$/i, {
      message: '排序方向只能是 asc 或 desc',
    }),
  );
}

/**
 * NoSQL注入防护
 */
@ValidatorConstraint({ name: 'isNoSqlInjection', async: false })
export class IsNoSqlInjectionConstraint
  implements ValidatorConstraintInterface
{
  validate(text: string): boolean {
    if (!text) return true;

    // 检查常见的NoSQL注入模式
    const dangerousPatterns = [
      /\$where/i,
      /\$ne/i,
      /\$gt/i,
      /\$lt/i,
      /\$gte/i,
      /\$lte/i,
      /\$in/i,
      /\$nin/i,
      /\$regex/i,
      /\$exists/i,
      /\$type/i,
      /\$mod/i,
      /\$all/i,
      /\$size/i,
      /\$elemMatch/i,
      /javascript:/i,
      /eval\s*\(/i,
      /setTimeout\s*\(/i,
      /setInterval\s*\(/i,
    ];

    return !dangerousPatterns.some((pattern) => pattern.test(text));
  }

  defaultMessage(): string {
    return '输入包含潜在的安全风险';
  }
}

export function IsNoSqlInjection(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return function (object: object, propertyName: string | symbol): void {
    const propName = propertyName.toString();
    registerDecorator({
      target: object.constructor,
      propertyName: propName,
      options: validationOptions,
      constraints: [],
      validator: IsNoSqlInjectionConstraint,
    });
  };
}

/**
 * 文件名验证
 */
export function IsFileName(
  maxLength = 255,
  _validationOptions?: ValidationOptions,
): PropertyDecorator {
  return applyDecorators(
    IsString({ message: '文件名必须是字符串' }),
    MinLength(1, { message: '文件名不能为空' }),
    MaxLength(maxLength, { message: `文件名长度不能超过${maxLength}个字符` }),
    // 允许安全的文件名字符
    Matches(/^[a-zA-Z0-9\u4e00-\u9fa5._-]+$/, {
      message: '文件名只能包含字母、数字、中文、点、下划线和连字符',
    }),
    // 禁止双点（防止目录遍历）
    Matches(/^(?!.*\.\.).*$/, {
      message: '文件名不能包含连续的点',
    }),
  );
}

/**
 * URL验证（更严格的安全检查）
 */
export function IsSecureUrl(
  _validationOptions?: ValidationOptions,
): PropertyDecorator {
  return applyDecorators(
    IsString({ message: 'URL必须是字符串' }),
    MaxLength(2000, { message: 'URL长度不能超过2000个字符' }),
    // 只允许HTTP和HTTPS协议
    Matches(/^https?:\/\//, {
      message: 'URL必须以 http:// 或 https:// 开头',
    }),
    // 禁止JavaScript伪协议
    Matches(/^(?!.*javascript:).*$/i, {
      message: 'URL不能包含JavaScript协议',
    }),
  );
}

/**
 * IP地址验证
 */
export function IsIPAddress(
  _validationOptions?: ValidationOptions,
): PropertyDecorator {
  return applyDecorators(
    IsString({ message: 'IP地址必须是字符串' }),
    // IPv4格式验证
    Matches(
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
      {
        message: 'IP地址格式不正确',
      },
    ),
  );
}

/**
 * 端口号验证
 */
export function IsPortNumber(
  _validationOptions?: ValidationOptions,
): PropertyDecorator {
  return applyDecorators(
    IsInt({ message: '端口号必须是整数' }),
    Min(1, { message: '端口号不能小于1' }),
    Max(65535, { message: '端口号不能大于65535' }),
  );
}
