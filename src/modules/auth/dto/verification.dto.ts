import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsStrongPassword } from '@/common/validators';

/**
 * 手机验证码DTO
 * 用于：手机验证码注册、登录、绑定
 */
export class PhoneVerificationDto {
  @ApiProperty({
    description: '手机号码',
    example: '13800138000',
  })
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '请输入有效的手机号码' })
  phone: string;

  @ApiProperty({
    description: '验证码',
    example: '123456',
  })
  @IsString()
  @MinLength(6, { message: '验证码长度为6位' })
  @MaxLength(6, { message: '验证码长度为6位' })
  @Matches(/^\d{6}$/, { message: '验证码必须为6位数字' })
  code: string;
}

/**
 * 邮箱验证码DTO
 * 用于：邮箱验证码注册、登录、绑定
 */
export class EmailVerificationDto {
  @ApiProperty({
    description: '邮箱地址',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  @MaxLength(100, { message: '邮箱长度不能超过100个字符' })
  email: string;

  @ApiProperty({
    description: '验证码',
    example: '123456',
  })
  @IsString()
  @MinLength(6, { message: '验证码长度为6位' })
  @MaxLength(6, { message: '验证码长度为6位' })
  @Matches(/^\d{6}$/, { message: '验证码必须为6位数字' })
  code: string;
}

/**
 * 账户设置DTO
 * 用于：设置用户名和登录密码
 */
export class AccountSetupDto {
  @ApiProperty({
    description: '用户名',
    example: 'merchant001',
  })
  @IsString()
  @MinLength(3, { message: '用户名长度至少3个字符' })
  @MaxLength(30, { message: '用户名长度不能超过30个字符' })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: '用户名只能包含字母、数字、下划线和连字符',
  })
  username: string;

  @ApiProperty({
    description: '登录密码（8-128字符，必须包含大小写字母、数字和特殊字符）',
    example: 'MySecure123!',
    minLength: 8,
    maxLength: 128,
  })
  @IsStrongPassword()
  @IsString()
  password: string;
}

/**
 * 设置安全密码DTO
 * 用于：设置6位数字安全密码
 */
export class SetSecurityPasswordDto {
  @ApiProperty({
    description: '6位数字安全密码（用于敏感操作验证）',
    example: '123456',
  })
  @IsString()
  @MinLength(6, { message: '安全密码必须为6位数字' })
  @MaxLength(6, { message: '安全密码必须为6位数字' })
  @Matches(/^\d{6}$/, { message: '安全密码必须为6位数字' })
  securityPassword: string;
}

/**
 * 验证安全密码DTO
 * 用于：验证6位数字安全密码
 */
export class VerifySecurityPasswordDto {
  @ApiProperty({
    description: '6位数字安全密码（用于敏感操作验证）',
    example: '123456',
  })
  @IsString()
  @MinLength(6, { message: '安全密码必须为6位数字' })
  @MaxLength(6, { message: '安全密码必须为6位数字' })
  @Matches(/^\d{6}$/, { message: '安全密码必须为6位数字' })
  securityPassword: string;
}
