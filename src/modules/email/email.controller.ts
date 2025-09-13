/**
 * 邮件推送服务控制器
 */

import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { Throttle } from '@nestjs/throttler';
import { EmailService } from './email.service';
import {
  SendNotificationDto,
  SendVerificationDto,
  VerifyEmailDto,
} from './dto/send-email.dto';

@ApiTags('Email Service')
@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('send-code')
  @Public()
  @Throttle({ default: { limit: 1, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '发送邮箱验证码' })
  @ApiResponse({ status: 200, description: '发送成功' })
  async sendVerificationCode(
    @Body() dto: SendVerificationDto,
  ): Promise<{ message: string }> {
    await this.emailService.sendVerificationCode(dto.email);
    return { message: '验证码已发送' };
  }

  @Post('verify-code')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '验证邮箱验证码' })
  @ApiResponse({ status: 200, description: '验证成功' })
  async verifyCode(@Body() dto: VerifyEmailDto): Promise<{ message: string }> {
    await this.emailService.verifyEmailCode(dto.email, dto.code);
    return { message: '验证成功' };
  }

  @Post('send-notification')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '发送通知邮件' })
  @ApiResponse({ status: 200, description: '发送成功' })
  async sendNotification(
    @Body() dto: SendNotificationDto,
  ): Promise<{ message: string }> {
    await this.emailService.sendNotification(
      dto.email,
      dto.subject,
      dto.message,
    );
    return { message: '通知邮件已发送' };
  }
}
