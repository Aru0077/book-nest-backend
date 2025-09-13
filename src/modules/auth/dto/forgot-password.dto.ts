import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { IsStrongPassword } from '@/common/validators';

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
    description: '新密码（8-128字符，必须包含大小写字母、数字和特殊字符）',
    example: 'NewPassword123!',
    minLength: 8,
    maxLength: 128,
  })
  @IsString()
  @IsNotEmpty({ message: '新密码不能为空' })
  @IsStrongPassword()
  newPassword: string;
}
