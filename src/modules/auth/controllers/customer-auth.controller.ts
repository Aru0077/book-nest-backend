/**
 * 客户认证控制器
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
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { CustomerAuthService } from '../services/customer-auth.service';
import { BaseAuthService } from '../services/base-auth.service';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { LoginResponseDto } from '../dto/auth-response.dto';
import {
  RefreshTokenDto,
  RefreshTokenResponseDto,
} from '../dto/refresh-token.dto';
import { AuthUser } from '../auth.types';

@ApiTags('Customer Auth')
@Controller('/customer/auth')
export class CustomerAuthController {
  constructor(
    private readonly customerAuthService: CustomerAuthService,
    private readonly baseAuthService: BaseAuthService,
  ) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '客户登录',
    description: '客户使用邮箱/手机号/用户名和密码进行登录',
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
        path: '/customer/auth/login',
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
        path: '/customer/auth/login',
        method: 'POST',
      },
    },
  })
  async login(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    return this.customerAuthService.login(loginDto);
  }

  @Post('register')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '客户注册',
    description:
      '新客户注册账户，需要提供邮箱/手机号/用户名中的至少一个作为登录凭证',
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
        path: '/customer/auth/register',
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
        path: '/customer/auth/register',
        method: 'POST',
      },
    },
  })
  async register(@Body() registerDto: RegisterDto): Promise<LoginResponseDto> {
    return this.customerAuthService.register(registerDto);
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '刷新访问令牌',
    description: '使用刷新令牌获取新的访问令牌和刷新令牌',
  })
  @ApiResponse({
    status: 200,
    description: '刷新成功',
    type: RefreshTokenResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: '刷新令牌无效或已过期',
    schema: {
      example: {
        success: false,
        code: 401,
        message: '刷新令牌已失效',
        timestamp: '2025-09-03T06:50:00.000Z',
        path: '/customer/auth/refresh',
        method: 'POST',
      },
    },
  })
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<RefreshTokenResponseDto> {
    return this.baseAuthService.refreshAccessToken(
      refreshTokenDto.refreshToken,
    );
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '客户注销',
    description: '注销当前客户，清除刷新令牌和缓存',
  })
  @ApiResponse({
    status: 200,
    description: '注销成功',
    schema: {
      example: {
        success: true,
        data: {
          message: '注销成功',
        },
        code: 200,
        message: 'Request successful',
        timestamp: '2025-09-03T06:50:00.000Z',
      },
    },
  })
  async logout(
    @CurrentUser() currentUser: AuthUser,
  ): Promise<{ message: string }> {
    await this.baseAuthService.logout(currentUser.id, currentUser.role);
    return { message: '注销成功' };
  }
}
