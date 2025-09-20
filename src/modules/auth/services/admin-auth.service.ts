/**
 * 管理员认证服务
 */

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@/prisma';
import { RedisService } from '@/redis';
import { BusinessError } from '@/common/exceptions';
import { BaseAuthService } from './base-auth.service';
import { SmsService } from '../../sms/sms.service';
import { EmailService } from '../../email/email.service';
import {
  AdminInfo,
  AdminRole,
  AdminStatus,
  LoginDto,
  LoginResponse,
  UserRole,
} from '../auth.types';

@Injectable()
export class AdminAuthService extends BaseAuthService {
  constructor(
    prisma: PrismaService,
    redis: RedisService,
    jwtService: JwtService,
    configService: ConfigService,
    private readonly smsService: SmsService,
    private readonly emailService: EmailService,
  ) {
    super(prisma, redis, jwtService, configService);
  }

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
        phone: user.phone || undefined,
      },
      ...tokens,
    };
  }

  /**
   * 发送验证码（统一接口）
   */
  async sendCode(contact: string): Promise<{ message: string }> {
    const isEmail = contact.includes('@');

    if (isEmail) {
      // 发送邮箱验证码
      await this.emailService.sendVerificationCode(contact);
    } else {
      // 发送手机验证码
      await this.smsService.sendVerificationCode(contact);
    }

    return { message: '验证码已发送' };
  }

  /**
   * 验证码登录/注册（统一接口）
   */
  async verifyLogin(contact: string, code: string): Promise<LoginResponse> {
    const isEmail = contact.includes('@');

    // 验证验证码
    if (isEmail) {
      await this.emailService.verifyEmailCode(contact, code);
    } else {
      await this.smsService.verifyCode(contact, code);
    }

    // 查找是否已存在用户
    const whereClause = isEmail ? { email: contact } : { phone: contact };
    let user = await this.prisma.adminUser.findUnique({
      where: whereClause,
    });

    // 如果用户不存在，则创建新用户（自动注册）
    if (!user) {
      const userData = isEmail
        ? { email: contact, emailVerified: true, password: '' }
        : { phone: contact, phoneVerified: true, password: '' };

      user = await this.prisma.adminUser.create({
        data: {
          ...userData,
          status: 'PENDING', // 管理员需要审批
          role: 'ADMIN',
        },
      });
    } else {
      // 更新验证状态
      const updateData = isEmail
        ? { emailVerified: true }
        : { phoneVerified: true };

      user = await this.prisma.adminUser.update({
        where: { id: user.id },
        data: updateData,
      });
    }

    // 检查管理员状态
    if (user.status === 'PENDING') {
      throw BusinessError.accountDisabled('管理员账户待审批');
    }
    if (user.status === 'REJECTED') {
      throw BusinessError.accountDisabled('管理员账户申请已被拒绝');
    }
    if (user.status !== 'ACTIVE') {
      throw BusinessError.accountDisabled('管理员账户已被禁用');
    }

    // 生成JWT双令牌
    const tokens = await this.generateTokens(user.id, UserRole.ADMIN);

    // 清除Redis中的旧用户缓存
    await this.clearUserCache(user.id, UserRole.ADMIN);

    return {
      user: {
        id: user.id,
        role: UserRole.ADMIN,
        email: user.email || undefined,
        phone: user.phone || undefined,
      },
      ...tokens,
    };
  }

  /**
   * 绑定联系方式（统一接口）
   */
  async bindContact(
    userId: string,
    contact: string,
    code: string,
  ): Promise<{ message: string }> {
    const isEmail = contact.includes('@');

    // 验证验证码
    if (isEmail) {
      await this.emailService.verifyEmailCode(contact, code);
    } else {
      await this.smsService.verifyCode(contact, code);
    }

    // 检查联系方式是否已被其他用户使用
    const whereClause = isEmail ? { email: contact } : { phone: contact };
    const existingUser = await this.prisma.adminUser.findUnique({
      where: whereClause,
    });
    if (existingUser && existingUser.id !== userId) {
      throw isEmail
        ? BusinessError.emailAlreadyExists()
        : BusinessError.phoneAlreadyExists();
    }

    // 更新用户联系方式
    const updateData = isEmail
      ? { email: contact, emailVerified: true }
      : { phone: contact, phoneVerified: true };

    await this.prisma.adminUser.update({
      where: { id: userId },
      data: updateData,
    });

    // 清除用户缓存
    await this.clearUserCache(userId, UserRole.ADMIN);

    return { message: '联系方式绑定成功' };
  }

  /**
   * 设置/修改登录密码
   */
  async setPassword(
    userId: string,
    newPassword: string,
    oldPassword?: string,
  ): Promise<{ message: string }> {
    // 获取用户当前信息
    const user = await this.prisma.adminUser.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!user) {
      throw BusinessError.userNotFound();
    }

    // 如果用户已有密码，需要验证原密码
    if (user.password && user.password.length > 0) {
      if (!oldPassword) {
        throw new BadRequestException('修改密码需要提供原密码');
      }
      const isOldPasswordValid = await bcrypt.compare(
        oldPassword,
        user.password,
      );
      if (!isOldPasswordValid) {
        throw new BadRequestException('原密码错误');
      }
    }

    // 加密新密码
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // 更新密码
    await this.prisma.adminUser.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // 清除用户缓存
    await this.clearUserCache(userId, UserRole.ADMIN);

    return { message: '密码设置成功' };
  }

  /**
   * 获取管理员认证状态信息
   */
  async getAuthProfile(userId: string): Promise<{
    hasPassword: boolean;
    hasPhone: boolean;
    phoneVerified: boolean;
    hasEmail: boolean;
    emailVerified: boolean;
  }> {
    // 获取用户信息
    const user = await this.prisma.adminUser.findUnique({
      where: { id: userId },
      select: {
        password: true,
        phone: true,
        phoneVerified: true,
        email: true,
        emailVerified: true,
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return {
      hasPassword: !!(user.password && user.password.length > 0),
      hasPhone: !!user.phone,
      phoneVerified: user.phoneVerified,
      hasEmail: !!user.email,
      emailVerified: user.emailVerified,
    };
  }

  // ========================================
  // 管理员审批功能 (Admin特有)
  // ========================================

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
    phone: string | null;
    status: string;
  }> {
    const user = await this.prisma.adminUser.findFirst({
      where: {
        OR: [{ email: identifier }, { phone: identifier }],
      },
    });
    if (!user) throw BusinessError.userNotFound();
    return user;
  }
}
