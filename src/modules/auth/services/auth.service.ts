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
import { BusinessError } from '@/common/exceptions';
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
  RefreshTokenPayload as _RefreshTokenPayload,
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

  /**
   * 管理员登录
   * 验证管理员身份并生成JWT双令牌
   * @param loginDto 登录数据传输对象，包含标识符(邮箱/手机号/用户名)和密码
   * @returns 包含用户信息和令牌的登录响应
   * @throws UnauthorizedException 当用户不存在、未激活或密码错误时抛出
   */
  async adminLogin(loginDto: LoginDto): Promise<LoginResponse> {
    // 根据标识符(邮箱/手机号/用户名)查找管理员用户
    const user = await this.findAdminUser(loginDto.identifier);

    // 检查管理员账户状态，只有ACTIVE状态的管理员才能登录
    if (user.status === 'PENDING') {
      throw BusinessError.accountDisabled('管理员账户待审批');
    }
    if (user.status === 'REJECTED') {
      throw BusinessError.accountDisabled('管理员账户申请已被拒绝');
    }
    if (user.status !== 'ACTIVE') {
      throw BusinessError.accountDisabled('管理员账户已被禁用');
    }

    // 验证密码是否正确
    await this.validatePassword(loginDto.password, user.password);

    // 生成JWT双令牌：访问令牌(7天)和刷新令牌(30天)
    const tokens = await this.generateTokens(
      user.id,
      UserRole.ADMIN,
      user.email || undefined,
    );

    // 清除Redis中的旧用户缓存，确保获取最新用户信息
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
   * 商家登录
   * 验证商家身份并生成JWT双令牌
   * @param loginDto 登录数据传输对象，包含标识符(邮箱/手机号/用户名)和密码
   * @returns 包含用户信息和令牌的登录响应
   * @throws UnauthorizedException 当用户不存在、未激活或密码错误时抛出
   */
  async merchantLogin(loginDto: LoginDto): Promise<LoginResponse> {
    // 根据标识符查找ACTIVE状态的商家用户
    const user = await this.findMerchantUser(loginDto.identifier);
    // 验证密码正确性
    await this.validatePassword(loginDto.password, user.password);

    // 生成JWT双令牌：访问令牌(7天)和刷新令牌(30天)
    const tokens = await this.generateTokens(
      user.id,
      UserRole.MERCHANT,
      user.email || undefined,
    );

    // 清除Redis中的旧用户缓存
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

  /**
   * 客户登录
   * 验证客户身份并生成JWT双令牌
   * @param loginDto 登录数据传输对象，包含标识符(邮箱/手机号/用户名)和密码
   * @returns 包含用户信息和令牌的登录响应
   * @throws UnauthorizedException 当用户不存在、未激活或密码错误时抛出
   */
  async customerLogin(loginDto: LoginDto): Promise<LoginResponse> {
    // 根据标识符查找ACTIVE状态的客户用户
    const user = await this.findCustomerUser(loginDto.identifier);
    // 验证密码正确性(客户密码可能为null，用于第三方登录)
    await this.validatePassword(loginDto.password, user.password!);

    // 生成JWT双令牌：访问令牌(7天)和刷新令牌(30天)
    const tokens = await this.generateTokens(
      user.id,
      UserRole.CUSTOMER,
      user.email || undefined,
    );

    // 清除Redis中的旧用户缓存
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

  /**
   * 商家注册
   * 商家自主注册，注册成功后立即生成令牌并返回(无需审批)
   * @param registerDto 注册数据传输对象，必须包含至少一种联系方式
   * @returns 包含用户信息和令牌的登录响应
   * @throws BadRequestException 当联系方式不足或已被注册时抛出
   */
  async merchantRegister(registerDto: RegisterDto): Promise<LoginResponse> {
    // 验证至少提供一种联系方式(邮箱/手机号/用户名)
    if (!registerDto.email && !registerDto.phone && !registerDto.username) {
      throw BusinessError.missingContactInfo();
    }

    // 检查是否已存在
    if (registerDto.email) {
      const exists = await this.prisma.merchantUser.findUnique({
        where: { email: registerDto.email },
      });
      if (exists) throw BusinessError.emailAlreadyExists();
    }

    if (registerDto.phone) {
      const exists = await this.prisma.merchantUser.findUnique({
        where: { phone: registerDto.phone },
      });
      if (exists) throw BusinessError.phoneAlreadyExists();
    }

    if (registerDto.username) {
      const exists = await this.prisma.merchantUser.findUnique({
        where: { username: registerDto.username },
      });
      if (exists) throw BusinessError.usernameAlreadyExists();
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

  /**
   * 客户注册
   * 客户自主注册，注册成功后立即生成令牌并返回(无需审批)
   * @param registerDto 注册数据传输对象，必须包含至少一种联系方式
   * @returns 包含用户信息和令牌的登录响应
   * @throws BadRequestException 当联系方式不足或已被注册时抛出
   */
  async customerRegister(registerDto: RegisterDto): Promise<LoginResponse> {
    // 验证至少提供一种联系方式(邮箱/手机号/用户名)
    if (!registerDto.email && !registerDto.phone && !registerDto.username) {
      throw BusinessError.missingContactInfo();
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
    if (!user) throw BusinessError.userNotFound();
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
    if (!user) throw BusinessError.userNotFound('用户不存在或未激活');
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
    if (!user) throw BusinessError.userNotFound('用户不存在或未激活');
    return user;
  }

  /**
   * 管理员注册
   * 管理员自主注册申请，需要超级管理员审批后才能使用
   * @param registerDto 注册数据传输对象，必须包含至少一种联系方式
   * @returns 注册申请提交成功消息
   * @throws BadRequestException 当联系方式不足或已被注册时抛出
   */
  async adminRegister(registerDto: RegisterDto): Promise<{ message: string }> {
    // 验证至少提供一种联系方式(邮箱/手机号/用户名)
    if (!registerDto.email && !registerDto.phone && !registerDto.username) {
      throw BusinessError.missingContactInfo();
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

  /**
   * 获取待审批的管理员列表
   * 超级管理员专用接口，查看所有待审批的管理员申请
   * @returns 待审批管理员信息列表，按申请时间排序
   */
  async getPendingAdmins(): Promise<AdminInfo[]> {
    // 查询数据库中所有PENDING状态的管理员申请
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
      orderBy: { appliedAt: 'asc' }, // 按申请时间升序排列，先申请的先处理
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
   * 超级管理员专用接口，将待审批的管理员申请设置为ACTIVE状态
   * @param adminId 管理员ID
   * @param approverId 审批人(超级管理员)ID
   * @returns 审批成功消息
   * @throws NotFoundException 当管理员申请不存在时抛出
   * @throws BadRequestException 当申请状态不是PENDING时抛出
   */
  async approveAdmin(
    adminId: string,
    approverId: string,
  ): Promise<{ message: string }> {
    // 查找指定的管理员申请
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      throw new NotFoundException('管理员申请不存在');
    }

    // 检查申请状态，只有PENDING状态的申请才能被审批
    if (admin.status !== 'PENDING') {
      throw new BadRequestException('该管理员申请状态不是待审批');
    }

    // 更新管理员状态为ACTIVE，记录审批人和审批时间
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
   * 超级管理员专用接口，将待审批的管理员申请设置为REJECTED状态
   * @param adminId 管理员ID
   * @param approverId 审批人(超级管理员)ID
   * @param rejectedReason 拒绝原因
   * @returns 拒绝成功消息
   * @throws NotFoundException 当管理员申请不存在时抛出
   * @throws BadRequestException 当申请状态不是PENDING时抛出
   */
  async rejectAdmin(
    adminId: string,
    approverId: string,
    rejectedReason: string,
  ): Promise<{ message: string }> {
    // 查找指定的管理员申请
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      throw new NotFoundException('管理员申请不存在');
    }

    // 检查申请状态，只有PENDING状态的申请才能被拒绝
    if (admin.status !== 'PENDING') {
      throw new BadRequestException('该管理员申请状态不是待审批');
    }

    // 更新管理员状态为REJECTED，记录审批人、审批时间和拒绝原因
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
    if (!isValid) throw BusinessError.invalidCredentials();
  }

  // ========================================
  // JWT令牌和缓存相关方法
  // ========================================

  /**
   * 生成JWT双令牌(访问令牌 + 刷新令牌)
   * 访问令牌用于日常API调用，刷新令牌用于获取新的访问令牌
   * @param userId 用户ID
   * @param role 用户角色
   * @param email 用户邮箱(可选)
   * @returns 包含访问令牌和刷新令牌的对象
   */
  private async generateTokens(
    userId: string,
    role: UserRole,
    email?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // 构建JWT载荷数据
    const payload: JwtPayload = {
      sub: userId, // 用户ID
      role, // 用户角色
      email, // 用户邮箱
    };

    // 生成访问令牌(默认有7天有效期)
    const accessToken = this.jwtService.sign(payload);

    // 生成刷新令牌(默认30天有效期，用于更新访问令牌)
    const refreshPayload = { ...payload, type: 'refresh' };
    const refreshToken = this.jwtService.sign(refreshPayload, {
      expiresIn: this.configService.get<string>(
        'JWT_REFRESH_EXPIRES_IN',
        '30d',
      ),
    });

    // 将刷新令牌安全存储到Redis中，TTL为30天
    const refreshTokenKey = `refresh_token:${userId}`;
    await this.redis.set(refreshTokenKey, refreshToken, 30 * 24 * 60 * 60); // 30天秒数

    return { accessToken, refreshToken };
  }

  /**
   * 刷新访问令牌
   * 使用有效的刷新令牌获取新的访问令牌和刷新令牌(自动轮换)
   * @param refreshToken 刷新令牌
   * @returns 包含新访问令牌和刷新令牌的对象
   * @throws UnauthorizedException 当刷新令牌无效、过期或用户不存在时抛出
   */
  async refreshAccessToken(
    refreshToken: string,
  ): Promise<RefreshTokenResponse> {
    try {
      // 验证刷新令牌的签名和过期时间
      const payload = this.jwtService.verify(
        refreshToken,
      ) as _RefreshTokenPayload;

      // 检查令牌类型是否为刷新令牌
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('无效的刷新令牌');
      }

      // 从 Redis 中检查刷新令牌是否存在且匹配(防止令牌重放攻击)
      const storedToken = await this.redis.get(`refresh_token:${payload.sub}`);
      if (!storedToken || storedToken !== refreshToken) {
        throw new UnauthorizedException('刷新令牌已失效');
      }

      // 从redis缓存中检查用户是否仍然有效且处于激活状态
      const user = await this.getUserFromCache(payload.sub, payload.role);
      if (!user) {
        throw new UnauthorizedException('用户不存在或已被禁用');
      }

      // 生成新的令牌对(访问令牌 + 新的刷新令牌)
      const tokens = await this.generateTokens(
        payload.sub,
        payload.role,
        payload.email,
      );

      return tokens;
    } catch (error) {
      // 保持已知的认证异常
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      // 其他错误统一归类为认证失败
      throw new UnauthorizedException('刷新令牌验证失败');
    }
  }

  /**
   * 从 Redis 缓存获取用户信息(智能缓存策略)
   * 缓存命中直接返回，缓存未命中则查询数据库并缓存结果
   * @param userId 用户ID
   * @param role 用户角色
   * @returns 缓存的用户信息或null
   */
  async getUserFromCache(
    userId: string,
    role: UserRole,
  ): Promise<CachedUser | null> {
    const cacheKey = `user:${role}:${userId}`;

    // 首先尝试从 Redis 缓存中获取用户信息
    let user = await this.redis.getObject<CachedUser>(cacheKey);

    if (!user) {
      // 缓存未命中，从数据库查询用户信息
      const dbUser = await this.getUserByRole(userId, role);
      if (!dbUser) {
        return null; // 用户不存在或已被禁用
      }

      // 构建缓存用户对象(包含认证必需信息)
      user = {
        id: dbUser.id,
        role,
        email: dbUser.email,
        phone: dbUser.phone,
        username: dbUser.username,
        status: dbUser.status,
        adminRole: dbUser.adminRole as AdminRole, // 仅管理员有此字段
      };

      // 将用户信息存入 Redis 缓存，TTL设置为15分钟
      await this.redis.setObject(cacheKey, user, 15 * 60);
      this.logger.debug(`用户信息已缓存: ${cacheKey}`);
    }

    return user;
  }

  /**
   * 清除用户缓存
   * 在用户信息发生变更或登录时清理缓存，确保数据一致性
   * @param userId 用户ID
   * @param role 用户角色
   */
  async clearUserCache(userId: string, role: UserRole): Promise<void> {
    const cacheKey = `user:${role}:${userId}`;
    await this.redis.del(cacheKey);
    this.logger.debug(`已清除用户缓存: ${cacheKey}`);
  }

  /**
   * 用户安全注销
   * 清除用户的刷新令牌和缓存信息，实现安全注销
   * @param userId 用户ID
   * @param role 用户角色
   */
  async logout(userId: string, role: UserRole): Promise<void> {
    // 从 Redis 中清除用户的刷新令牌，使其无法继续刷新访问令牌
    await this.redis.del(`refresh_token:${userId}`);
    // 清除用户缓存信息，确保下次访问时重新从数据库获取
    await this.clearUserCache(userId, role);
    this.logger.log(`用户已安全注销: ${userId}`);
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
