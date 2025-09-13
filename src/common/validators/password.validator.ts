/**
 * 强密码验证装饰器
 * 实现企业级密码安全策略
 */

import { applyDecorators } from '@nestjs/common';
import {
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
} from 'class-validator';

/**
 * 简化密码策略要求：
 * 1. 长度8-50字符
 * 2. 至少包含字母和数字
 * 3. 不能是常见弱密码
 * 4. 不能包含连续重复字符（超过2个）
 */
export function IsStrongPassword(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return applyDecorators(
    IsString({ message: '密码必须是字符串' }),
    MinLength(8, { message: '密码长度不能少于8位' }),
    MaxLength(50, { message: '密码长度不能超过50位' }),
    Matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&.,-_]{8,50}$/, {
      message: '密码必须包含字母和数字，可包含特殊字符(@$!%*?&.,-_)',
    }),
    IsNotCommonPassword(validationOptions),
    NoConsecutiveRepeats(validationOptions),
  );
}

/**
 * 验证不是常见弱密码
 */
@ValidatorConstraint({ name: 'isNotCommonPassword', async: false })
export class IsNotCommonPasswordConstraint
  implements ValidatorConstraintInterface
{
  // 常见弱密码列表（精简版）
  private readonly commonPasswords = [
    '12345678',
    '87654321',
    'password',
    'Password',
    'password123',
    'Password123',
    'abcd1234',
    'qwerty123',
    'admin123',
    'user1234',
    '11111111',
    '00000000',
    'password1',
    'Password1',
    'qwertyui',
    'asdfghjk',
    '1qaz2wsx',
    '1q2w3e4r',
    '123456789',
    '987654321',
  ];

  validate(password: string): boolean {
    if (!password) return false;

    // 检查是否在常见密码列表中
    const lowerPassword = password.toLowerCase();
    return !this.commonPasswords.some(
      (commonPwd) => lowerPassword === commonPwd.toLowerCase(),
    );
  }

  defaultMessage(_args: ValidationArguments): string {
    return '密码过于简单，请使用更复杂的密码';
  }
}

export function IsNotCommonPassword(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return function (object: object, propertyName: string | symbol): void {
    const propName = propertyName.toString();
    registerDecorator({
      target: object.constructor,
      propertyName: propName,
      options: validationOptions,
      constraints: [],
      validator: IsNotCommonPasswordConstraint,
    });
  };
}

/**
 * 验证没有连续重复字符
 */
@ValidatorConstraint({ name: 'noConsecutiveRepeats', async: false })
export class NoConsecutiveRepeatsConstraint
  implements ValidatorConstraintInterface
{
  validate(password: string): boolean {
    if (!password) return false;

    // 检查连续重复字符（超过2个）
    for (let i = 0; i < password.length - 2; i++) {
      if (
        password[i] === password[i + 1] &&
        password[i + 1] === password[i + 2]
      ) {
        return false; // 发现连续3个相同字符
      }
    }

    return true;
  }

  defaultMessage(_args: ValidationArguments): string {
    return '密码不能包含连续重复的字符';
  }
}

export function NoConsecutiveRepeats(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return function (object: object, propertyName: string | symbol): void {
    const propName = propertyName.toString();
    registerDecorator({
      target: object.constructor,
      propertyName: propName,
      options: validationOptions,
      constraints: [],
      validator: NoConsecutiveRepeatsConstraint,
    });
  };
}
