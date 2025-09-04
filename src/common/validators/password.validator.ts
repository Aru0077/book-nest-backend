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
 * 强密码策略要求：
 * 1. 长度8-128字符
 * 2. 至少包含一个小写字母
 * 3. 至少包含一个大写字母
 * 4. 至少包含一个数字
 * 5. 至少包含一个特殊字符
 * 6. 不能包含连续重复字符（超过2个）
 * 7. 不能是常见弱密码
 */
export function IsStrongPassword(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return applyDecorators(
    IsString({ message: '密码必须是字符串' }),
    MinLength(8, { message: '密码长度不能少于8位' }),
    MaxLength(128, { message: '密码长度不能超过128位' }),
    Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
      message: '密码必须包含大写字母、小写字母、数字和特殊字符(@$!%*?&)',
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
  // 常见弱密码列表
  private readonly commonPasswords = [
    '12345678',
    '87654321',
    'password',
    'Password',
    'password123',
    'Password123',
    'abcd1234',
    'ABCD1234',
    'qwerty123',
    'admin123',
    'user1234',
    '11111111',
    '00000000',
    'aaaaaaaa',
    'AAAAAAAA',
    'password1',
    'Password1',
    'qwertyui',
    'asdfghjk',
    'zxcvbnm1',
    '1qaz2wsx',
    '1q2w3e4r',
    'qweasdzx',
    '123qwe123',
    'abc123456',
    '123456789',
    '987654321',
    'qwer1234',
    'asdf1234',
    '1234qwer',
    '1234asdf',
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
  return function (object: object, propertyName: string): void {
    registerDecorator({
      target: object.constructor,
      propertyName,
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
  return function (object: object, propertyName: string): void {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: NoConsecutiveRepeatsConstraint,
    });
  };
}

/**
 * 密码强度评估
 */
export enum PasswordStrength {
  WEAK = 1,
  FAIR = 2,
  GOOD = 3,
  STRONG = 4,
  VERY_STRONG = 5,
}

/**
 * 评估密码强度
 */
export function evaluatePasswordStrength(password: string): PasswordStrength {
  if (!password) return PasswordStrength.WEAK;

  let score = 0;

  // 长度评分
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;

  // 字符类型评分
  if (/[a-z]/.test(password)) score++; // 小写字母
  if (/[A-Z]/.test(password)) score++; // 大写字母
  if (/[0-9]/.test(password)) score++; // 数字
  if (/[@$!%*?&]/.test(password)) score++; // 特殊字符

  // 复杂性评分
  if (
    password.length >= 10 &&
    /[a-zA-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[@$!%*?&]/.test(password)
  ) {
    score++; // 混合字符类型奖励
  }

  // 避免常见模式减分
  const commonPatterns = [
    /123/, // 连续数字
    /abc/i, // 连续字母
    /qwe/i, // 键盘模式
    /(.)\1{2,}/, // 连续重复字符
  ];

  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      score = Math.max(score - 1, 0);
    }
  }

  // 返回强度等级
  if (score <= 2) return PasswordStrength.WEAK;
  if (score <= 4) return PasswordStrength.FAIR;
  if (score <= 6) return PasswordStrength.GOOD;
  if (score <= 7) return PasswordStrength.STRONG;
  return PasswordStrength.VERY_STRONG;
}

/**
 * 获取密码强度描述
 */
export function getPasswordStrengthDescription(
  strength: PasswordStrength,
): string {
  const descriptions = {
    [PasswordStrength.WEAK]: '弱',
    [PasswordStrength.FAIR]: '一般',
    [PasswordStrength.GOOD]: '良好',
    [PasswordStrength.STRONG]: '强',
    [PasswordStrength.VERY_STRONG]: '极强',
  };

  return descriptions[strength];
}

/**
 * 生成密码建议
 */
export function getPasswordSuggestions(password: string): string[] {
  const suggestions: string[] = [];

  if (password.length < 8) {
    suggestions.push('密码长度应至少8位');
  }

  if (!/[a-z]/.test(password)) {
    suggestions.push('添加小写字母');
  }

  if (!/[A-Z]/.test(password)) {
    suggestions.push('添加大写字母');
  }

  if (!/[0-9]/.test(password)) {
    suggestions.push('添加数字');
  }

  if (!/[@$!%*?&]/.test(password)) {
    suggestions.push('添加特殊字符 (@$!%*?&)');
  }

  if (/(.)\1{2,}/.test(password)) {
    suggestions.push('避免连续重复字符');
  }

  if (password.length < 12) {
    suggestions.push('建议使用12位以上密码以提高安全性');
  }

  return suggestions;
}
