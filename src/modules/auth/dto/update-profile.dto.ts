import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: '邮箱地址',
    example: 'newemail@example.com',
  })
  @IsOptional()
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  @MaxLength(100, { message: '邮箱长度不能超过100个字符' })
  email?: string;

  @ApiPropertyOptional({
    description: '手机号码',
    example: '13900139000',
  })
  @IsOptional()
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '请输入有效的手机号码' })
  phone?: string;

  @ApiPropertyOptional({
    description: '用户名',
    example: 'newusername',
  })
  @IsOptional()
  @IsString()
  @MinLength(3, { message: '用户名长度至少3个字符' })
  @MaxLength(30, { message: '用户名长度不能超过30个字符' })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: '用户名只能包含字母、数字、下划线和连字符',
  })
  username?: string;
}
