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
  ValidationOptions,
} from 'class-validator';

/**
 * 安全的字符串验证（防XSS）
 * @param minLength 最小长度，默认1
 * @param maxLength 最大长度，默认255
 * @param allowRichText 是否允许富文本字符（标点符号等），默认false
 */
export function IsSafeString(
  minLength = 1,
  maxLength = 255,
  allowRichText = false,
): PropertyDecorator {
  const validations = [
    IsString({ message: '必须是字符串' }),
    MinLength(minLength, { message: `最少${minLength}个字符` }),
    MaxLength(maxLength, { message: `最多${maxLength}个字符` }),
    // 内置NoSQL注入防护
    Matches(
      /^(?!.*\$where)(?!.*\$ne)(?!.*\$gt)(?!.*\$lt)(?!.*javascript:)(?!.*eval\s*\().*$/i,
      {
        message: '输入包含潜在的安全风险',
      },
    ),
  ];

  if (allowRichText) {
    // 允许富文本，但禁止危险的脚本标签
    validations.push(
      Matches(/^(?!.*<script)(?!.*javascript:)(?!.*onclick)(?!.*onerror).*$/i, {
        message: '内容包含潜在的安全风险',
      }),
    );
  } else {
    // 严格模式，禁止XSS字符
    validations.push(
      Matches(/^[^<>&"']*$/, {
        message: '包含非法字符，不允许使用 < > & " \' 字符',
      }),
    );
  }

  return applyDecorators(...validations);
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
