/**
 * 管理员认证服务
 */

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { BusinessError } from '@/common/exceptions';
import { BaseAuthService } from './base-auth.service';
import {
  AdminInfo,
  AdminRole,
  AdminStatus,
  LoginDto,
  LoginResponse,
  RegisterDto,
  UserRole,
} from '../auth.types';

@Injectable()
export class AdminAuthService extends BaseAuthService {
  /**
   * 管理员登录
   */
  async login(loginDto: LoginDto): Promise<LoginResponse> {
    const user = await this.findAdminUser(loginDto.identifier);

    if (user.status === 'PENDING') {
      throw BusinessError.accountDisabled('管理员账户待审批');
    }
    if (user.status === 'REJECTED') {
      throw BusinessError.accountDisabled('管理员账户申请已被拒绝');
    }
    if (user.status !== 'ACTIVE') {
      throw BusinessError.accountDisabled('管理员账户已被禁用');
    }

    await this.validatePassword(loginDto.password, user.password);

    const tokens = await this.generateTokens(
      user.id,
      UserRole.ADMIN,
      user.email || undefined,
    );

    await this.clearUserCache(user.id, UserRole.ADMIN);

    return {
      user: {
        id: user.id,
        role: UserRole.ADMIN,
        email: user.email || undefined,
      },
      ...tokens,
    };
  }

  /**
   * 管理员注册
   */
  async register(registerDto: RegisterDto): Promise<{ message: string }> {
    if (!registerDto.email && !registerDto.phone && !registerDto.username) {
      throw BusinessError.missingContactInfo();
    }

    // 检查是否已存在
    await this.checkAdminExists(registerDto);

    const hashedPassword = await bcrypt.hash(registerDto.password, 12);

    await this.prisma.adminUser.create({
      data: {
        ...registerDto,
        password: hashedPassword,
        status: 'PENDING',
        role: 'ADMIN',
      },
    });

    return { message: '管理员注册申请已提交，等待超级管理员审批' };
  }

  /**
   * 获取待审批的管理员列表
   */
  async getPendingAdmins(): Promise<AdminInfo[]> {
    const pendingAdmins = await this.prisma.adminUser.findMany({
      where: { status: 'PENDING' },
      select: {
        id: true,
        role: true,
        status: true,
        email: true,
        phone: true,
        username: true,
        appliedAt: true,
        approvedBy: true,
        approvedAt: true,
        rejectedReason: true,
      },
      orderBy: { appliedAt: 'asc' },
    });

    return pendingAdmins.map((admin) => ({
      id: admin.id,
      role: admin.role as AdminRole,
      status: admin.status as AdminStatus,
      email: admin.email || undefined,
      phone: admin.phone || undefined,
      username: admin.username || undefined,
      appliedAt: admin.appliedAt,
      approvedBy: admin.approvedBy || undefined,
      approvedAt: admin.approvedAt || undefined,
      rejectedReason: admin.rejectedReason || undefined,
    }));
  }

  /**
   * 审批通过管理员申请
   */
  async approveAdmin(
    adminId: string,
    approverId: string,
  ): Promise<{ message: string }> {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      throw new NotFoundException('管理员申请不存在');
    }

    if (admin.status !== 'PENDING') {
      throw new BadRequestException('该管理员申请状态不是待审批');
    }

    await this.prisma.adminUser.update({
      where: { id: adminId },
      data: {
        status: 'ACTIVE',
        approvedBy: approverId,
        approvedAt: new Date(),
      },
    });

    return { message: '管理员申请已通过审批' };
  }

  /**
   * 拒绝管理员申请
   */
  async rejectAdmin(
    adminId: string,
    approverId: string,
    rejectedReason: string,
  ): Promise<{ message: string }> {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      throw new NotFoundException('管理员申请不存在');
    }

    if (admin.status !== 'PENDING') {
      throw new BadRequestException('该管理员申请状态不是待审批');
    }

    await this.prisma.adminUser.update({
      where: { id: adminId },
      data: {
        status: 'REJECTED',
        approvedBy: approverId,
        approvedAt: new Date(),
        rejectedReason,
      },
    });

    return { message: '管理员申请已被拒绝' };
  }

  /**
   * 查找管理员用户
   */
  private async findAdminUser(identifier: string): Promise<{
    id: string;
    password: string;
    email: string | null;
    status: string;
  }> {
    const user = await this.prisma.adminUser.findFirst({
      where: {
        OR: [
          { email: identifier },
          { phone: identifier },
          { username: identifier },
        ],
      },
    });
    if (!user) throw BusinessError.userNotFound();
    return user;
  }

  /**
   * 检查管理员是否已存在
   */
  private async checkAdminExists(registerDto: RegisterDto): Promise<void> {
    if (registerDto.email) {
      const exists = await this.prisma.adminUser.findUnique({
        where: { email: registerDto.email },
      });
      if (exists) throw new BadRequestException('邮箱已被注册');
    }

    if (registerDto.phone) {
      const exists = await this.prisma.adminUser.findUnique({
        where: { phone: registerDto.phone },
      });
      if (exists) throw new BadRequestException('手机号已被注册');
    }

    if (registerDto.username) {
      const exists = await this.prisma.adminUser.findUnique({
        where: { username: registerDto.username },
      });
      if (exists) throw new BadRequestException('用户名已被注册');
    }
  }
}
