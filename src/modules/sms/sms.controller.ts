/**
 * 短信服务控制器
 */

import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { Throttle } from '@nestjs/throttler';
import { SmsService } from './sms.service';
import { SendSmsDto, VerifySmsDto } from './dto/send-sms.dto';

@ApiTags('SMS Service')
@Controller('sms')
export class SmsController {
  constructor(private readonly smsService: SmsService) {}

  @Post('send-code')
  @Public()
  @Throttle({ default: { limit: 1, ttl: 60000 } }) // 60秒内最多发送1次
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '发送短信验证码',
    description: '向指定手机号发送6位数字验证码，验证码5分钟有效',
  })
  @ApiResponse({
    status: 200,
    description: '发送成功',
    schema: {
      example: {
        success: true,
        data: {
          message: '验证码已发送',
          phone: '138****8000',
        },
        code: 200,
        message: 'Request successful',
        timestamp: '2025-09-08T10:00:00.000Z',
      },
    },
  })
  @ApiBadRequestResponse({
    description: '发送失败',
    schema: {
      example: {
        success: false,
        code: 400,
        message: '发送过于频繁，请60秒后再试',
        timestamp: '2025-09-08T10:00:00.000Z',
        path: '/api/v1/sms/send-code',
        method: 'POST',
      },
    },
  })
  async sendCode(
    @Body() sendSmsDto: SendSmsDto,
  ): Promise<{ message: string; phone: string }> {
    await this.smsService.sendVerificationCode(sendSmsDto.phone);

    // 脱敏显示手机号
    const maskedPhone = sendSmsDto.phone.replace(
      /(\d{3})\d{4}(\d{4})/,
      '$1****$2',
    );

    return {
      message: '验证码已发送',
      phone: maskedPhone,
    };
  }

  @Post('verify-code')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '验证短信验证码',
    description: '验证手机号和验证码是否匹配',
  })
  @ApiResponse({
    status: 200,
    description: '验证成功',
    schema: {
      example: {
        success: true,
        data: {
          message: '验证成功',
        },
        code: 200,
        message: 'Request successful',
        timestamp: '2025-09-08T10:00:00.000Z',
      },
    },
  })
  @ApiBadRequestResponse({
    description: '验证失败',
    schema: {
      example: {
        success: false,
        code: 400,
        message: '验证码错误或已过期',
        timestamp: '2025-09-08T10:00:00.000Z',
        path: '/api/v1/sms/verify-code',
        method: 'POST',
      },
    },
  })
  async verifyCode(
    @Body() verifySmsDto: VerifySmsDto,
  ): Promise<{ message: string }> {
    await this.smsService.verifyCode(verifySmsDto.phone, verifySmsDto.code);
    return { message: '验证成功' };
  }
}
