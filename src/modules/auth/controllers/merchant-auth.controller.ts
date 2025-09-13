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
  AccountSetupDto,
  EmailVerificationDto,
  LoginDto,
  LoginResponseDto,
  MerchantAuthProfileDto,
  PhoneVerificationDto,
  RefreshTokenDto,
  RefreshTokenResponseDto,
  RegisterDto,
  SetSecurityPasswordDto,
  VerifySecurityPasswordDto,
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
        path: '/merchant/auth/register',
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
        path: '/merchant/auth/register',
        method: 'POST',
      },
    },
  })
  async register(@Body() registerDto: RegisterDto): Promise<LoginResponseDto> {
    return this.merchantAuthService.register(registerDto);
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
  @Post('send-sms-code')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '发送注册用短信验证码',
    description: '为商家注册发送短信验证码，会先检查手机号是否已被注册',
  })
  @ApiResponse({
    status: 200,
    description: '验证码发送成功',
    schema: {
      example: {
        success: true,
        data: {
          message: '验证码已发送',
          phone: '138****8000',
        },
        code: 200,
        message: 'Request successful',
        timestamp: '2025-09-11T10:00:00.000Z',
      },
    },
  })
  @ApiConflictResponse({
    description: '手机号已被注册',
  })
  async sendSmsCode(
    @Body() { phone }: { phone: string },
  ): Promise<{ message: string; phone: string }> {
    return this.merchantAuthService.sendRegistrationSmsCode(phone);
  }

  @Post('send-email-code')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '发送注册用邮箱验证码',
    description: '为商家注册发送邮箱验证码，会先检查邮箱是否已被注册',
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
        timestamp: '2025-09-11T10:00:00.000Z',
      },
    },
  })
  @ApiConflictResponse({
    description: '邮箱已被注册',
  })
  async sendEmailCode(
    @Body() { email }: { email: string },
  ): Promise<{ message: string }> {
    return this.merchantAuthService.sendRegistrationEmailCode(email);
  }

  // ========================================
  // 验证码认证接口
  // ========================================

  @Post('register/phone-code')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '手机验证码注册',
    description: '使用手机号和短信验证码注册商家账户',
  })
  @ApiResponse({
    status: 201,
    description: '注册成功',
    type: LoginResponseDto,
  })
  @ApiBadRequestResponse({
    description: '请求参数错误或验证码无效',
  })
  @ApiConflictResponse({
    description: '手机号已被注册',
  })
  async registerByPhoneCode(
    @Body() registerDto: PhoneVerificationDto,
  ): Promise<LoginResponseDto> {
    return this.merchantAuthService.registerByPhoneCode(
      registerDto.phone,
      registerDto.code,
    );
  }

  @Post('register/email-code')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '邮箱验证码注册',
    description: '使用邮箱和邮箱验证码注册商家账户',
  })
  @ApiResponse({
    status: 201,
    description: '注册成功',
    type: LoginResponseDto,
  })
  @ApiBadRequestResponse({
    description: '请求参数错误或验证码无效',
  })
  @ApiConflictResponse({
    description: '邮箱已被注册',
  })
  async registerByEmailCode(
    @Body() registerDto: EmailVerificationDto,
  ): Promise<LoginResponseDto> {
    return this.merchantAuthService.registerByEmailCode(
      registerDto.email,
      registerDto.code,
    );
  }

  @Post('login/phone-code')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '手机验证码登录',
    description: '使用手机号和短信验证码登录',
  })
  @ApiResponse({
    status: 200,
    description: '登录成功',
    type: LoginResponseDto,
  })
  @ApiBadRequestResponse({
    description: '请求参数错误或验证码无效',
  })
  @ApiUnauthorizedResponse({
    description: '手机号未注册或未验证',
  })
  async loginByPhoneCode(
    @Body() loginDto: PhoneVerificationDto,
  ): Promise<LoginResponseDto> {
    return this.merchantAuthService.loginByPhoneCode(
      loginDto.phone,
      loginDto.code,
    );
  }

  @Post('login/email-code')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '邮箱验证码登录',
    description: '使用邮箱和邮箱验证码登录',
  })
  @ApiResponse({
    status: 200,
    description: '登录成功',
    type: LoginResponseDto,
  })
  @ApiBadRequestResponse({
    description: '请求参数错误或验证码无效',
  })
  @ApiUnauthorizedResponse({
    description: '邮箱未注册或未验证',
  })
  async loginByEmailCode(
    @Body() loginDto: EmailVerificationDto,
  ): Promise<LoginResponseDto> {
    return this.merchantAuthService.loginByEmailCode(
      loginDto.email,
      loginDto.code,
    );
  }

  // ========================================
  // 账户绑定接口
  // ========================================

  @Post('bind/phone')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '绑定手机号',
    description: '使用短信验证码绑定手机号到当前账户',
  })
  @ApiResponse({
    status: 200,
    description: '绑定成功',
    schema: {
      example: {
        success: true,
        data: { message: '手机号绑定成功' },
        code: 200,
        message: 'Request successful',
        timestamp: '2025-09-10T06:30:00.000Z',
      },
    },
  })
  @ApiBadRequestResponse({
    description: '请求参数错误或验证码无效',
  })
  @ApiConflictResponse({
    description: '手机号已被其他用户使用',
  })
  async bindPhone(
    @CurrentUser() currentUser: AuthUser,
    @Body() bindPhoneDto: PhoneVerificationDto,
  ): Promise<{ message: string }> {
    return this.merchantAuthService.bindPhone(
      currentUser.id,
      bindPhoneDto.phone,
      bindPhoneDto.code,
    );
  }

  @Post('bind/email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '绑定邮箱',
    description: '使用邮箱验证码绑定邮箱到当前账户',
  })
  @ApiResponse({
    status: 200,
    description: '绑定成功',
    schema: {
      example: {
        success: true,
        data: { message: '邮箱绑定成功' },
        code: 200,
        message: 'Request successful',
        timestamp: '2025-09-10T06:30:00.000Z',
      },
    },
  })
  @ApiBadRequestResponse({
    description: '请求参数错误或验证码无效',
  })
  @ApiConflictResponse({
    description: '邮箱已被其他用户使用',
  })
  async bindEmail(
    @CurrentUser() currentUser: AuthUser,
    @Body() bindEmailDto: EmailVerificationDto,
  ): Promise<{ message: string }> {
    return this.merchantAuthService.bindEmail(
      currentUser.id,
      bindEmailDto.email,
      bindEmailDto.code,
    );
  }

  @Post('bind/account')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '设置账号密码',
    description: '为当前用户设置用户名和密码，用于密码登录',
  })
  @ApiResponse({
    status: 200,
    description: '设置成功',
    schema: {
      example: {
        success: true,
        data: { message: '账号密码设置成功' },
        code: 200,
        message: 'Request successful',
        timestamp: '2025-09-10T06:30:00.000Z',
      },
    },
  })
  @ApiBadRequestResponse({
    description: '请求参数错误',
  })
  @ApiConflictResponse({
    description: '用户名已被使用',
  })
  async bindAccount(
    @CurrentUser() currentUser: AuthUser,
    @Body() bindAccountDto: AccountSetupDto,
  ): Promise<{ message: string }> {
    return this.merchantAuthService.setAccount(
      currentUser.id,
      bindAccountDto.username,
      bindAccountDto.password,
    );
  }

  // ========================================
  // 安全验证接口
  // ========================================

  @Post('security/set')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '设置安全密码',
    description: '设置6位数字安全密码，用于敏感操作验证',
  })
  @ApiResponse({
    status: 200,
    description: '设置成功',
    schema: {
      example: {
        success: true,
        data: { message: '安全密码设置成功' },
        code: 200,
        message: 'Request successful',
        timestamp: '2025-09-10T06:30:00.000Z',
      },
    },
  })
  @ApiBadRequestResponse({
    description: '请求参数错误',
  })
  async setSecurityPassword(
    @CurrentUser() currentUser: AuthUser,
    @Body() setPasswordDto: SetSecurityPasswordDto,
  ): Promise<{ message: string }> {
    return this.merchantAuthService.setSecurityPassword(
      currentUser.id,
      setPasswordDto.securityPassword,
    );
  }

  @Post('security/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '验证安全密码',
    description: '验证6位数字安全密码，用于敏感操作确认',
  })
  @ApiResponse({
    status: 200,
    description: '验证成功',
    schema: {
      example: {
        success: true,
        data: { message: '验证成功' },
        code: 200,
        message: 'Request successful',
        timestamp: '2025-09-10T06:30:00.000Z',
      },
    },
  })
  @ApiBadRequestResponse({
    description: '安全密码错误或未设置',
  })
  async verifySecurityPassword(
    @CurrentUser() currentUser: AuthUser,
    @Body() verifyDto: VerifySecurityPasswordDto,
  ): Promise<{ message: string }> {
    return this.merchantAuthService.verifySecurityPassword(
      currentUser.id,
      verifyDto.securityPassword,
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
