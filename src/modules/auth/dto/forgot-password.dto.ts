import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    description: '找回密码标识符(邮箱/手机号)',
    example: 'user@example.com',
  })
  @IsString()
  @IsNotEmpty({ message: '标识符不能为空' })
  @MaxLength(100, { message: '标识符长度不能超过100个字符' })
  identifier: string;
}

export class ResetPasswordDto {
  @ApiProperty({
    description: '重置令牌',
    example: 'reset-token-12345',
  })
  @IsString()
  @IsNotEmpty({ message: '重置令牌不能为空' })
  token: string;

  @ApiProperty({
    description: '新密码',
    example: 'NewPassword123!',
    minLength: 8,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty({ message: '新密码不能为空' })
  newPassword: string;
}
