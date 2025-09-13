import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendVerificationDto {
  @ApiProperty({ description: '邮箱地址', example: 'user@example.com' })
  @IsEmail({}, { message: '邮箱格式不正确' })
  @IsNotEmpty({ message: '邮箱地址不能为空' })
  email: string;
}

export class VerifyEmailDto extends SendVerificationDto {
  @ApiProperty({ description: '验证码', example: '123456' })
  @IsString()
  @IsNotEmpty({ message: '验证码不能为空' })
  code: string;
}

export class SendNotificationDto extends SendVerificationDto {
  @ApiProperty({ description: '邮件主题', example: 'BookNest系统通知' })
  @IsString()
  @IsNotEmpty({ message: '邮件主题不能为空' })
  subject: string;

  @ApiProperty({ description: '邮件内容', example: '您的订单状态已更新' })
  @IsString()
  @IsNotEmpty({ message: '邮件内容不能为空' })
  message: string;
}
