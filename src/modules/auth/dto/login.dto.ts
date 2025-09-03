import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: '登录标识符(邮箱/手机号/用户名)',
    example: 'admin@booknest.com',
  })
  @IsString()
  @IsNotEmpty({ message: '登录标识符不能为空' })
  @MaxLength(100, { message: '登录标识符长度不能超过100个字符' })
  identifier: string;

  @ApiProperty({
    description: '密码',
    example: 'password123',
    minLength: 6,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty({ message: '密码不能为空' })
  @MinLength(6, { message: '密码长度至少6个字符' })
  @MaxLength(50, { message: '密码长度不能超过50个字符' })
  password: string;
}
