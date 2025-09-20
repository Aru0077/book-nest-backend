import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { IsStrongPassword } from '@/common/validators';

export class LoginDto {
  @ApiProperty({
    description: '登录标识符(邮箱/手机号)',
    example: '13800138000 或 user@example.com',
  })
  @IsString()
  @IsNotEmpty({ message: '登录标识符不能为空' })
  @MaxLength(100, { message: '登录标识符长度不能超过100个字符' })
  identifier: string;

  @ApiProperty({
    description: '密码（8-128字符，必须包含大小写字母、数字和特殊字符）',
    example: 'password123',
    minLength: 8,
    maxLength: 128,
  })
  @IsString()
  @IsNotEmpty({ message: '密码不能为空' })
  @IsStrongPassword()
  password: string;
}
