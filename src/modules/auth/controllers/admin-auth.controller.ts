/**
 * 管理员认证控制器
 */

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { SuperAdminOnly } from '@/common/decorators/admin-roles.decorator';
import { CustomThrottle } from '@/common/decorators/throttle.decorator';
import { AdminAuthService } from '../services/admin-auth.service';
import { BaseAuthService } from '../services/base-auth.service';
import { LoginDto } from '../dto/login.dto';
import { LoginResponseDto } from '../dto/auth-response.dto';
import { AdminApprovalDto, AdminInfoDto } from '../dto/admin-approval.dto';
import {
  RefreshTokenDto,
  RefreshTokenResponseDto,
} from '../dto/refresh-token.dto';
import {
  BindContactDto,
  SendCodeDto,
  SetPasswordDto,
  VerifyLoginDto,
} from '../dto/unified-auth.dto';
import { AuthUser } from '../auth.types';

@ApiTags('Admin Auth')
@Controller('/admin/auth')
export class AdminAuthController {
  constructor(
    private readonly adminAuthService: AdminAuthService,
    private readonly baseAuthService: BaseAuthService,
  ) {}

  // ========================================
  // 基础认证接口 (8个，与Merchant一致)
  // ========================================

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '管理员登录',
    description: '管理员使用邮箱/手机号和密码进行登录',
  })
  @ApiResponse({
    status: 200,
    description: '登录成功',
    type: LoginResponseDto,
  })
  @ApiBadRequestResponse({
    description: '请求参数错误',
  })
  @ApiUnauthorizedResponse({
    description: '认证失败',
  })
  async login(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    return this.adminAuthService.login(loginDto);
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
    summary: '管理员注销',
    description: '注销当前管理员，清除刷新令牌和缓存',
  })
  @ApiResponse({
    status: 200,
    description: '注销成功',
  })
  async logout(
    @CurrentUser() currentUser: AuthUser,
  ): Promise<{ message: string }> {
    await this.baseAuthService.logout(currentUser.id, currentUser.role);
    return { message: '注销成功' };
  }

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
  })
  async sendCode(
    @Body() sendCodeDto: SendCodeDto,
  ): Promise<{ message: string }> {
    return this.adminAuthService.sendCode(sendCodeDto.contact);
  }

  @Post('verify-login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '验证码登录/注册',
    description:
      '使用手机号或邮箱验证码登录，如果未注册则自动注册后登录（需要审批）',
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
    return this.adminAuthService.verifyLogin(
      verifyLoginDto.contact,
      verifyLoginDto.code,
    );
  }

  @Post('set-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '设置/修改登录密码',
    description: '设置或修改登录密码，用于密码登录',
  })
  @ApiResponse({
    status: 200,
    description: '设置成功',
  })
  @ApiBadRequestResponse({
    description: '请求参数错误或原密码错误',
  })
  async setPassword(
    @CurrentUser() currentUser: AuthUser,
    @Body() setPasswordDto: SetPasswordDto,
  ): Promise<{ message: string }> {
    return this.adminAuthService.setPassword(
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
    return this.adminAuthService.bindContact(
      currentUser.id,
      bindContactDto.contact,
      bindContactDto.code,
    );
  }

  @Get('profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '获取认证状态',
    description: '获取当前管理员的认证状态信息',
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
  })
  async getAuthProfile(@CurrentUser() currentUser: AuthUser): Promise<{
    hasPassword: boolean;
    hasPhone: boolean;
    phoneVerified: boolean;
    hasEmail: boolean;
    emailVerified: boolean;
  }> {
    return this.adminAuthService.getAuthProfile(currentUser.id);
  }

  // ========================================
  // 管理员审批功能 (Admin特有)
  // ========================================

  @Get('pending')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '获取待审批的管理员列表',
    description: '超级管理员获取所有待审批的管理员申请列表',
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    type: [AdminInfoDto],
  })
  @ApiForbiddenResponse({
    description: '权限不足',
  })
  @SuperAdminOnly()
  async getPendingAdmins(): Promise<AdminInfoDto[]> {
    return this.adminAuthService.getPendingAdmins();
  }

  @Post('approve/:adminId')
  @CustomThrottle({
    short: { limit: 2, ttl: 5000 },
    medium: { limit: 5, ttl: 60000 },
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '审批通过管理员申请',
    description: '超级管理员审批通过管理员注册申请',
  })
  @ApiResponse({
    status: 200,
    description: '审批成功',
  })
  @ApiNotFoundResponse({
    description: '管理员申请不存在',
  })
  @ApiBadRequestResponse({
    description: '申请状态不正确',
  })
  @SuperAdminOnly()
  async approveAdmin(
    @Param('adminId') adminId: string,
    @CurrentUser() currentUser: AuthUser,
  ): Promise<{ message: string }> {
    return this.adminAuthService.approveAdmin(adminId, currentUser.id);
  }

  @Put('reject/:adminId')
  @CustomThrottle({
    short: { limit: 2, ttl: 5000 },
    medium: { limit: 5, ttl: 60000 },
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '拒绝管理员申请',
    description: '超级管理员拒绝管理员注册申请',
  })
  @ApiResponse({
    status: 200,
    description: '拒绝成功',
  })
  @ApiNotFoundResponse({
    description: '管理员申请不存在',
  })
  @ApiBadRequestResponse({
    description: '申请状态不正确',
  })
  @SuperAdminOnly()
  async rejectAdmin(
    @Param('adminId') adminId: string,
    @Body() approvalDto: AdminApprovalDto,
    @CurrentUser() currentUser: AuthUser,
  ): Promise<{ message: string }> {
    const rejectedReason = approvalDto.rejectedReason || '未提供拒绝原因';
    return this.adminAuthService.rejectAdmin(
      adminId,
      currentUser.id,
      rejectedReason,
    );
  }
}
