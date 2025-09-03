/**
 * 认证服务 - 精简版
 */

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '@/prisma';
import { RedisService } from '@/redis';
import {
  AdminInfo,
  AdminRole,
  AdminStatus,
  CachedUser,
  JwtPayload,
  LoginDto,
  LoginResponse,
  RefreshTokenResponse,
  RegisterDto,
  UserRole,
} from '../auth.types';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // 管理员登录
  async adminLogin(loginDto: LoginDto): Promise<LoginResponse> {
    const user = await this.findAdminUser(loginDto.identifier);

    // 检查管理员状态
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('管理员账户未激活或已被禁用');
    }

    await this.validatePassword(loginDto.password, user.password);

    // 生成访问令牌和刷新令牌
    const tokens = await this.generateTokens(
      user.id,
      UserRole.ADMIN,
      user.email || undefined,
    );

    // 清除旧的用户缓存
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

  // 商家登录
  async merchantLogin(loginDto: LoginDto): Promise<LoginResponse> {
    const user = await this.findMerchantUser(loginDto.identifier);
    await this.validatePassword(loginDto.password, user.password);

    // 生成访问令牌和刷新令牌
    const tokens = await this.generateTokens(
      user.id,
      UserRole.MERCHANT,
      user.email || undefined,
    );

    // 清除旧的用户缓存
    await this.clearUserCache(user.id, UserRole.MERCHANT);

    return {
      user: {
        id: user.id,
        role: UserRole.MERCHANT,
        email: user.email || undefined,
      },
      ...tokens,
    };
  }

  // 客户登录
  async customerLogin(loginDto: LoginDto): Promise<LoginResponse> {
    const user = await this.findCustomerUser(loginDto.identifier);
    await this.validatePassword(loginDto.password, user.password!);

    // 生成访问令牌和刷新令牌
    const tokens = await this.generateTokens(
      user.id,
      UserRole.CUSTOMER,
      user.email || undefined,
    );

    // 清除旧的用户缓存
    await this.clearUserCache(user.id, UserRole.CUSTOMER);

    return {
      user: {
        id: user.id,
        role: UserRole.CUSTOMER,
        email: user.email || undefined,
      },
      ...tokens,
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

    // 生成访问令牌和刷新令牌
    const tokens = await this.generateTokens(
      user.id,
      UserRole.MERCHANT,
      user.email || undefined,
    );

    return {
      user: {
        id: user.id,
        role: UserRole.MERCHANT,
        email: user.email || undefined,
      },
      ...tokens,
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

    // 生成访问令牌和刷新令牌
    const tokens = await this.generateTokens(
      user.id,
      UserRole.CUSTOMER,
      user.email || undefined,
    );

    return {
      user: {
        id: user.id,
        role: UserRole.CUSTOMER,
        email: user.email || undefined,
      },
      ...tokens,
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

  // ========================================
  // JWT令牌和缓存相关方法
  // ========================================

  /**
   * 生成访问令牌和刷新令牌
   */
  private async generateTokens(
    userId: string,
    role: UserRole,
    email?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: JwtPayload = {
      sub: userId,
      role,
      email,
    };

    // 生成访问令牌
    const accessToken = this.jwtService.sign(payload);

    // 生成刷新令牌（有效期更长）
    const refreshPayload = { ...payload, type: 'refresh' };
    const refreshToken = this.jwtService.sign(refreshPayload, {
      expiresIn: this.configService.get<string>(
        'JWT_REFRESH_EXPIRES_IN',
        '30d',
      ),
    });

    // 将刷新令牌存储到Redis
    const refreshTokenKey = `refresh_token:${userId}`;
    await this.redis.set(refreshTokenKey, refreshToken, 30 * 24 * 60 * 60); // 30天

    return { accessToken, refreshToken };
  }

  /**
   * 刷新访问令牌
   */
  async refreshAccessToken(
    refreshToken: string,
  ): Promise<RefreshTokenResponse> {
    try {
      // 验证刷新令牌
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const payload = this.jwtService.verify(refreshToken);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('无效的刷新令牌');
      }

      // 检查Redis中的刷新令牌是否存在
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const storedToken = await this.redis.get(`refresh_token:${payload.sub}`);
      if (!storedToken || storedToken !== refreshToken) {
        throw new UnauthorizedException('刷新令牌已失效');
      }

      // 检查用户是否仍然有效
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      const user = await this.getUserFromCache(payload.sub, payload.role);
      if (!user) {
        throw new UnauthorizedException('用户不存在或已被禁用');
      }

      // 生成新的令牌对
      const tokens = await this.generateTokens(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        payload.sub,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        payload.role,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        payload.email,
      );

      return tokens;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('刷新令牌验证失败');
    }
  }

  /**
   * 从缓存获取用户信息，如果不存在则从数据库查询并缓存
   */
  async getUserFromCache(
    userId: string,
    role: UserRole,
  ): Promise<CachedUser | null> {
    const cacheKey = `user:${role}:${userId}`;

    // 先尝试从缓存获取
    let user = await this.redis.getObject<CachedUser>(cacheKey);

    if (!user) {
      // 缓存中不存在，从数据库查询
      const dbUser = await this.getUserByRole(userId, role);
      if (!dbUser) {
        return null;
      }

      // 构建缓存用户对象
      user = {
        id: dbUser.id,
        role,
        email: dbUser.email,
        phone: dbUser.phone,
        username: dbUser.username,
        status: dbUser.status,
        adminRole: dbUser.adminRole as AdminRole,
      };

      // 存入缓存，TTL为15分钟
      await this.redis.setObject(cacheKey, user, 15 * 60);
      this.logger.debug(`用户信息已缓存: ${cacheKey}`);
    }

    return user;
  }

  /**
   * 清除用户缓存
   */
  async clearUserCache(userId: string, role: UserRole): Promise<void> {
    const cacheKey = `user:${role}:${userId}`;
    await this.redis.del(cacheKey);
    this.logger.debug(`已清除用户缓存: ${cacheKey}`);
  }

  /**
   * 注销用户（清除刷新令牌和缓存）
   */
  async logout(userId: string, role: UserRole): Promise<void> {
    // 清除刷新令牌
    await this.redis.del(`refresh_token:${userId}`);
    // 清除用户缓存
    await this.clearUserCache(userId, role);
    this.logger.log(`用户已注销: ${userId}`);
  }

  /**
   * 根据角色获取用户信息（包含adminRole）
   */
  private async getUserByRole(
    userId: string,
    role: UserRole,
  ): Promise<{
    id: string;
    email: string | null;
    phone: string | null;
    username: string | null;
    status: string;
    adminRole?: string;
  } | null> {
    switch (role) {
      case UserRole.ADMIN: {
        const admin = await this.prisma.adminUser.findUnique({
          where: { id: userId, status: 'ACTIVE' },
          select: {
            id: true,
            email: true,
            phone: true,
            username: true,
            status: true,
            role: true,
          },
        });
        if (admin) {
          return {
            ...admin,
            adminRole: admin.role,
          };
        }
        return admin;
      }
      case UserRole.MERCHANT:
        return this.prisma.merchantUser.findUnique({
          where: { id: userId, status: 'ACTIVE' },
          select: {
            id: true,
            email: true,
            phone: true,
            username: true,
            status: true,
          },
        });
      case UserRole.CUSTOMER:
        return this.prisma.customerUser.findUnique({
          where: { id: userId, status: 'ACTIVE' },
          select: {
            id: true,
            email: true,
            phone: true,
            username: true,
            status: true,
          },
        });
      default:
        return null;
    }
  }
}
