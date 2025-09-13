import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendSmsDto {
  @ApiProperty({
    description: '手机号码',
    example: '13800138000',
  })
  @IsString()
  @IsNotEmpty({ message: '手机号码不能为空' })
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号码格式不正确' })
  phone: string;
}

export class VerifySmsDto extends SendSmsDto {
  @ApiProperty({
    description: '验证码',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty({ message: '验证码不能为空' })
  @Matches(/^\d{6}$/, { message: '验证码必须是6位数字' })
  code: string;
}
