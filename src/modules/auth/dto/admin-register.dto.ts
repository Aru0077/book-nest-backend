import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class AdminRegisterDto {
  @ApiPropertyOptional({
    description: '邮箱地址',
    example: 'admin@company.com',
  })
  @IsOptional()
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  @MaxLength(100, { message: '邮箱长度不能超过100个字符' })
  email?: string;

  @ApiPropertyOptional({
    description: '手机号码',
    example: '13800138000',
  })
  @IsOptional()
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '请输入有效的手机号码' })
  phone?: string;

  @ApiPropertyOptional({
    description: '用户名',
    example: 'admin001',
  })
  @IsOptional()
  @IsString()
  @MinLength(3, { message: '用户名长度至少3个字符' })
  @MaxLength(30, { message: '用户名长度不能超过30个字符' })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: '用户名只能包含字母、数字、下划线和连字符',
  })
  username?: string;

  @ApiProperty({
    description: '密码',
    example: 'AdminPassword123!',
    minLength: 8,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty({ message: '密码不能为空' })
  @MinLength(8, { message: '密码长度至少8个字符' })
  @MaxLength(50, { message: '密码长度不能超过50个字符' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/, {
    message: '密码必须包含至少一个小写字母、一个大写字母和一个数字',
  })
  password: string;
}
