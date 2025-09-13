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
import {
  AuthThrottle,
  CustomThrottle,
  RegisterThrottle,
} from '@/common/decorators/throttle.decorator';
import { AdminAuthService } from '../services/admin-auth.service';
import { BaseAuthService } from '../services/base-auth.service';
import { LoginDto } from '../dto/login.dto';
import { LoginResponseDto } from '../dto/auth-response.dto';
import { AdminRegisterDto } from '../dto/admin-register.dto';
import { AdminApprovalDto, AdminInfoDto } from '../dto/admin-approval.dto';
import {
  RefreshTokenDto,
  RefreshTokenResponseDto,
} from '../dto/refresh-token.dto';
import { AuthUser } from '../auth.types';

@ApiTags('Admin Auth')
@Controller('/admin/auth')
export class AdminAuthController {
  constructor(
    private readonly adminAuthService: AdminAuthService,
    private readonly baseAuthService: BaseAuthService,
  ) {}

  // 管理员登录
  @Post('login')
  @Public()
  @AuthThrottle() // 应用认证限流
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '管理员登录',
    description: '管理员使用邮箱/手机号/用户名和密码进行登录',
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
        path: '/admin/auth/login',
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
        path: '/admin/auth/login',
        method: 'POST',
      },
    },
  })
  async login(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    return this.adminAuthService.login(loginDto);
  }

  // 管理员自助注册
  @Post('register')
  @Public()
  @RegisterThrottle() // 应用注册限流
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '管理员自助注册',
    description: '新管理员自助注册申请，需要超级管理员审批后才能使用',
  })
  @ApiResponse({
    status: 201,
    description: '注册申请提交成功',
    schema: {
      example: {
        success: true,
        data: {
          message: '管理员注册申请已提交，等待超级管理员审批',
        },
        code: 201,
        message: 'Request successful',
        timestamp: '2025-09-03T06:50:00.000Z',
      },
    },
  })
  @ApiBadRequestResponse({
    description: '请求参数错误',
    schema: {
      example: {
        success: false,
        code: 400,
        message: '至少提供一个联系方式',
        timestamp: '2025-09-03T06:50:00.000Z',
        path: '/admin/auth/register',
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
        timestamp: '2025-09-03T06:50:00.000Z',
        path: '/admin/auth/register',
        method: 'POST',
      },
    },
  })
  async register(
    @Body() registerDto: AdminRegisterDto,
  ): Promise<{ message: string }> {
    return this.adminAuthService.register(registerDto);
  }

  // 获取待审批的管理员列表
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
    schema: {
      example: {
        success: false,
        code: 403,
        message: '只有超级管理员可以查看待审批列表',
        timestamp: '2025-09-03T06:50:00.000Z',
        path: '/admin/auth/pending',
        method: 'GET',
      },
    },
  })
  @SuperAdminOnly()
  async getPendingAdmins(): Promise<AdminInfoDto[]> {
    return this.adminAuthService.getPendingAdmins();
  }

  // 审批通过管理员申请
  @Post('approve/:adminId')
  @CustomThrottle({
    short: { limit: 2, ttl: 5000 },
    medium: { limit: 5, ttl: 60000 },
  }) // 审批限流
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '审批通过管理员申请',
    description: '超级管理员审批通过管理员注册申请',
  })
  @ApiResponse({
    status: 200,
    description: '审批成功',
    schema: {
      example: {
        success: true,
        data: {
          message: '管理员申请已通过审批',
        },
        code: 200,
        message: 'Request successful',
        timestamp: '2025-09-03T06:50:00.000Z',
      },
    },
  })
  @ApiNotFoundResponse({
    description: '管理员申请不存在',
    schema: {
      example: {
        success: false,
        code: 404,
        message: '管理员申请不存在',
        timestamp: '2025-09-03T06:50:00.000Z',
        path: '/admin/auth/approve/clq123',
        method: 'POST',
      },
    },
  })
  @ApiBadRequestResponse({
    description: '申请状态不正确',
    schema: {
      example: {
        success: false,
        code: 400,
        message: '该管理员申请状态不是待审批',
        timestamp: '2025-09-03T06:50:00.000Z',
        path: '/admin/auth/approve/clq123',
        method: 'POST',
      },
    },
  })
  @SuperAdminOnly()
  async approveAdmin(
    @Param('adminId') adminId: string,
    @CurrentUser() currentUser: AuthUser,
  ): Promise<{ message: string }> {
    return this.adminAuthService.approveAdmin(adminId, currentUser.id);
  }

  // 拒绝管理员申请
  @Put('reject/:adminId')
  @CustomThrottle({
    short: { limit: 2, ttl: 5000 },
    medium: { limit: 5, ttl: 60000 },
  }) // 拒绝限流
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '拒绝管理员申请',
    description: '超级管理员拒绝管理员注册申请',
  })
  @ApiResponse({
    status: 200,
    description: '拒绝成功',
    schema: {
      example: {
        success: true,
        data: {
          message: '管理员申请已被拒绝',
        },
        code: 200,
        message: 'Request successful',
        timestamp: '2025-09-03T06:50:00.000Z',
      },
    },
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

  // 刷新访问令牌
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
        path: '/admin/auth/refresh',
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

  // 管理员注销
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '管理员注销',
    description: '注销当前管理员，清除刷新令牌和缓存',
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
