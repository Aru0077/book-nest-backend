/**
 * 商家认证控制器
 */

import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { AuthService } from '../services/auth.service';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { LoginResponseDto } from '../dto/auth-response.dto';

@ApiTags('Merchant Auth')
@Controller('api/v1/merchant/auth')
export class MerchantAuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '商家登录',
    description: '商家使用邮箱/手机号/用户名和密码进行登录',
  })
  @ApiResponse({
    status: 200,
    description: '登录成功',
    type: LoginResponseDto,
  })
  @ApiBadRequestResponse({
    description: '请求参数错误',
    schema: {
      example: {
        success: false,
        code: 400,
        message: '登录标识符不能为空',
        timestamp: '2025-09-03T02:30:00.000Z',
        path: '/api/v1/merchant/auth/login',
        method: 'POST',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: '认证失败',
    schema: {
      example: {
        success: false,
        code: 401,
        message: '用户不存在或未激活',
        timestamp: '2025-09-03T02:30:00.000Z',
        path: '/api/v1/merchant/auth/login',
        method: 'POST',
      },
    },
  })
  async login(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.merchantLogin(loginDto);
  }

  @Post('register')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '商家注册',
    description:
      '新商家注册账户，需要提供邮箱/手机号/用户名中的至少一个作为登录凭证',
  })
  @ApiResponse({
    status: 201,
    description: '注册成功',
    type: LoginResponseDto,
  })
  @ApiBadRequestResponse({
    description: '请求参数错误',
    schema: {
      example: {
        success: false,
        code: 400,
        message: '至少提供一个联系方式',
        timestamp: '2025-09-03T02:30:00.000Z',
        path: '/api/v1/merchant/auth/register',
        method: 'POST',
      },
    },
  })
  @ApiConflictResponse({
    description: '注册信息冲突',
    schema: {
      example: {
        success: false,
        code: 409,
        message: '邮箱已被注册',
        timestamp: '2025-09-03T02:30:00.000Z',
        path: '/api/v1/merchant/auth/register',
        method: 'POST',
      },
    },
  })
  async register(@Body() registerDto: RegisterDto): Promise<LoginResponseDto> {
    return this.authService.merchantRegister(registerDto);
  }
}
