import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsStrongPassword } from '@/common/validators';

/**
 * 发送验证码DTO
 * 用于：发送手机/邮箱验证码
 */
export class SendCodeDto {
  @ApiProperty({
    description: '联系方式（手机号或邮箱）',
    example: '13800138000 或 user@example.com',
  })
  @IsString()
  contact: string;
}

/**
 * 验证码登录/注册DTO
 * 用于：验证码登录（已注册则登录，未注册则注册后登录）
 */
export class VerifyLoginDto {
  @ApiProperty({
    description: '联系方式（手机号或邮箱）',
    example: '13800138000 或 user@example.com',
  })
  @IsString()
  contact: string;

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
 * 设置密码DTO
 * 用于：设置或修改登录密码
 */
export class SetPasswordDto {
  @ApiProperty({
    description: '新密码（8-128字符，必须包含大小写字母、数字和特殊字符）',
    example: 'MySecure123!',
    minLength: 8,
    maxLength: 128,
  })
  @IsStrongPassword()
  @IsString()
  password: string;

  @ApiPropertyOptional({
    description: '原密码（修改密码时必须提供）',
    example: 'OldPassword123!',
  })
  @IsOptional()
  @IsString()
  oldPassword?: string;
}

/**
 * 绑定联系方式DTO
 * 用于：绑定新的手机号或邮箱
 */
export class BindContactDto {
  @ApiProperty({
    description: '联系方式（手机号或邮箱）',
    example: '13800138000 或 user@example.com',
  })
  @IsString()
  contact: string;

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
