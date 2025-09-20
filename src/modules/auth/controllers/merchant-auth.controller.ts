/**
 * 商家认证控制器
 */

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
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
import { MerchantAuthService } from '../services/merchant-auth.service';
import { BaseAuthService } from '../services/base-auth.service';
import {
  BindContactDto,
  LoginDto,
  LoginResponseDto,
  MerchantAuthProfileDto,
  RefreshTokenDto,
  RefreshTokenResponseDto,
  SendCodeDto,
  SetPasswordDto,
  VerifyLoginDto,
} from '../dto';
import { AuthUser } from '../auth.types';

@ApiTags('Merchant Auth')
@Controller('/merchant/auth')
export class MerchantAuthController {
  constructor(
    private readonly merchantAuthService: MerchantAuthService,
    private readonly baseAuthService: BaseAuthService,
  ) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '商家登录',
    description: '商家使用邮箱/手机号和密码进行登录',
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
        path: '/merchant/auth/login',
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
        path: '/merchant/auth/login',
        method: 'POST',
      },
    },
  })
  async login(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    return this.merchantAuthService.login(loginDto);
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
        path: '/merchant/auth/refresh',
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
    summary: '商家注销',
    description: '注销当前商家，清除刷新令牌和缓存',
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

  // ========================================
  // 验证码发送接口
  // ========================================
  @Post('send-code')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '发送验证码',
    description: '发送手机号或邮箱验证码，用于登录或绑定',
  })
  @ApiResponse({
    status: 200,
    description: '验证码发送成功',
    schema: {
      example: {
        success: true,
        data: {
          message: '验证码已发送',
        },
        code: 200,
        message: 'Request successful',
        timestamp: '2025-09-15T10:00:00.000Z',
      },
    },
  })
  async sendCode(
    @Body() sendCodeDto: SendCodeDto,
  ): Promise<{ message: string }> {
    return this.merchantAuthService.sendCode(sendCodeDto.contact);
  }

  // ========================================
  // 验证码登录/注册接口
  // ========================================

  @Post('verify-login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '验证码登录/注册',
    description: '使用手机号或邮箱验证码登录，如果未注册则自动注册后登录',
  })
  @ApiResponse({
    status: 200,
    description: '登录/注册成功',
    type: LoginResponseDto,
  })
  @ApiBadRequestResponse({
    description: '请求参数错误或验证码无效',
  })
  async verifyLogin(
    @Body() verifyLoginDto: VerifyLoginDto,
  ): Promise<LoginResponseDto> {
    return this.merchantAuthService.verifyLogin(
      verifyLoginDto.contact,
      verifyLoginDto.code,
    );
  }

  // ========================================
  // 账户设置接口
  // ========================================

  @Post('set-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '设置/修改登录密码',
    description: '设置或修改登录密码，用于密码登录',
  })
  @ApiResponse({
    status: 200,
    description: '设置成功',
    schema: {
      example: {
        success: true,
        data: { message: '密码设置成功' },
        code: 200,
        message: 'Request successful',
        timestamp: '2025-09-15T10:30:00.000Z',
      },
    },
  })
  @ApiBadRequestResponse({
    description: '请求参数错误或原密码错误',
  })
  async setPassword(
    @CurrentUser() currentUser: AuthUser,
    @Body() setPasswordDto: SetPasswordDto,
  ): Promise<{ message: string }> {
    return this.merchantAuthService.setPassword(
      currentUser.id,
      setPasswordDto.password,
      setPasswordDto.oldPassword,
    );
  }

  @Post('bind-contact')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '绑定联系方式',
    description: '使用验证码绑定新的手机号或邮箱到当前账户',
  })
  @ApiResponse({
    status: 200,
    description: '绑定成功',
    schema: {
      example: {
        success: true,
        data: { message: '联系方式绑定成功' },
        code: 200,
        message: 'Request successful',
        timestamp: '2025-09-15T10:30:00.000Z',
      },
    },
  })
  @ApiBadRequestResponse({
    description: '请求参数错误或验证码无效',
  })
  @ApiConflictResponse({
    description: '联系方式已被其他用户使用',
  })
  async bindContact(
    @CurrentUser() currentUser: AuthUser,
    @Body() bindContactDto: BindContactDto,
  ): Promise<{ message: string }> {
    return this.merchantAuthService.bindContact(
      currentUser.id,
      bindContactDto.contact,
      bindContactDto.code,
    );
  }

  // ========================================
  // 状态查询接口
  // ========================================

  @Get('profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '获取认证状态',
    description: '获取当前商家的认证状态信息',
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    type: MerchantAuthProfileDto,
  })
  async getAuthProfile(
    @CurrentUser() currentUser: AuthUser,
  ): Promise<MerchantAuthProfileDto> {
    return this.merchantAuthService.getAuthProfile(currentUser.id);
  }
}
