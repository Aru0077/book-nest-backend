/**
 * 认证服务 - 精简版
 */

import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '@/prisma';
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
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // 管理员登录
  async adminLogin(loginDto: LoginDto): Promise<LoginResponse> {
    const user = await this.findAdminUser(loginDto.identifier);

    // 检查管理员状态
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('管理员账户未激活或已被禁用');
    }

    await this.validatePassword(loginDto.password, user.password);

    const payload = { sub: user.id, role: UserRole.ADMIN, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    return {
      user: {
        id: user.id,
        role: UserRole.ADMIN,
        email: user.email || undefined,
      },
      accessToken,
    };
  }

  // 商家登录
  async merchantLogin(loginDto: LoginDto): Promise<LoginResponse> {
    const user = await this.findMerchantUser(loginDto.identifier);
    await this.validatePassword(loginDto.password, user.password);

    const payload = {
      sub: user.id,
      role: UserRole.MERCHANT,
      email: user.email,
    };
    const accessToken = this.jwtService.sign(payload);

    return {
      user: {
        id: user.id,
        role: UserRole.MERCHANT,
        email: user.email || undefined,
      },
      accessToken,
    };
  }

  // 客户登录
  async customerLogin(loginDto: LoginDto): Promise<LoginResponse> {
    const user = await this.findCustomerUser(loginDto.identifier);
    await this.validatePassword(loginDto.password, user.password!);

    const payload = {
      sub: user.id,
      role: UserRole.CUSTOMER,
      email: user.email,
    };
    const accessToken = this.jwtService.sign(payload);

    return {
      user: {
        id: user.id,
        role: UserRole.CUSTOMER,
        email: user.email || undefined,
      },
      accessToken,
    };
  }

  // 商家注册
  async merchantRegister(registerDto: RegisterDto): Promise<LoginResponse> {
    if (!registerDto.email && !registerDto.phone && !registerDto.username) {
      throw new BadRequestException('至少提供一个联系方式');
    }

    // 检查是否已存在
    if (registerDto.email) {
      const exists = await this.prisma.merchantUser.findUnique({
        where: { email: registerDto.email },
      });
      if (exists) throw new BadRequestException('邮箱已被注册');
    }

    if (registerDto.phone) {
      const exists = await this.prisma.merchantUser.findUnique({
        where: { phone: registerDto.phone },
      });
      if (exists) throw new BadRequestException('手机号已被注册');
    }

    if (registerDto.username) {
      const exists = await this.prisma.merchantUser.findUnique({
        where: { username: registerDto.username },
      });
      if (exists) throw new BadRequestException('用户名已被注册');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 12);

    const user = await this.prisma.merchantUser.create({
      data: {
        ...registerDto,
        password: hashedPassword,
      },
    });

    const payload = {
      sub: user.id,
      role: UserRole.MERCHANT,
      email: user.email,
    };
    const accessToken = this.jwtService.sign(payload);

    return {
      user: {
        id: user.id,
        role: UserRole.MERCHANT,
        email: user.email || undefined,
      },
      accessToken,
    };
  }

  // 客户注册
  async customerRegister(registerDto: RegisterDto): Promise<LoginResponse> {
    if (!registerDto.email && !registerDto.phone && !registerDto.username) {
      throw new BadRequestException('至少提供一个联系方式');
    }

    // 检查是否已存在
    if (registerDto.email) {
      const exists = await this.prisma.customerUser.findUnique({
        where: { email: registerDto.email },
      });
      if (exists) throw new BadRequestException('邮箱已被注册');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 12);

    const user = await this.prisma.customerUser.create({
      data: {
        ...registerDto,
        password: hashedPassword,
      },
    });

    const payload = {
      sub: user.id,
      role: UserRole.CUSTOMER,
      email: user.email,
    };
    const accessToken = this.jwtService.sign(payload);

    return {
      user: {
        id: user.id,
        role: UserRole.CUSTOMER,
        email: user.email || undefined,
      },
      accessToken,
    };
  }

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
    if (!user) throw new UnauthorizedException('用户不存在');
    return user;
  }

  private async findMerchantUser(
    identifier: string,
  ): Promise<{ id: string; password: string; email: string | null }> {
    const user = await this.prisma.merchantUser.findFirst({
      where: {
        OR: [
          { email: identifier },
          { phone: identifier },
          { username: identifier },
        ],
        status: 'ACTIVE',
      },
    });
    if (!user) throw new UnauthorizedException('用户不存在或未激活');
    return user;
  }

  private async findCustomerUser(
    identifier: string,
  ): Promise<{ id: string; password: string | null; email: string | null }> {
    const user = await this.prisma.customerUser.findFirst({
      where: {
        OR: [
          { email: identifier },
          { phone: identifier },
          { username: identifier },
        ],
        status: 'ACTIVE',
      },
    });
    if (!user) throw new UnauthorizedException('用户不存在或未激活');
    return user;
  }

  // 管理员注册
  async adminRegister(registerDto: RegisterDto): Promise<{ message: string }> {
    if (!registerDto.email && !registerDto.phone && !registerDto.username) {
      throw new BadRequestException('至少提供一个联系方式');
    }

    // 检查是否已存在
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

    const hashedPassword = await bcrypt.hash(registerDto.password, 12);

    await this.prisma.adminUser.create({
      data: {
        ...registerDto,
        password: hashedPassword,
        status: 'PENDING', // 默认为待审批状态
        role: 'ADMIN', // 默认为普通管理员
      },
    });

    return { message: '管理员注册申请已提交，等待超级管理员审批' };
  }

  // 获取待审批的管理员列表
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

  // 审批通过管理员申请
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

  // 拒绝管理员申请
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

  private async validatePassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<void> {
    const isValid = await bcrypt.compare(plainPassword, hashedPassword);
    if (!isValid) throw new UnauthorizedException('密码错误');
  }
}
