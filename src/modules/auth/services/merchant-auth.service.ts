/**
 * 商家认证服务
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
import { LoginDto, LoginResponse, RegisterDto, UserRole } from '../auth.types';

@Injectable()
export class MerchantAuthService extends BaseAuthService {
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
   * 商家登录
   */
  async login(loginDto: LoginDto): Promise<LoginResponse> {
    const user = await this.findMerchantUser(loginDto.identifier);
    await this.validatePassword(loginDto.password, user.password);

    const tokens = await this.generateTokens(
      user.id,
      UserRole.MERCHANT,
      user.email || undefined,
    );

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
   * 商家注册
   */
  async register(registerDto: RegisterDto): Promise<LoginResponse> {
    if (!registerDto.email && !registerDto.phone && !registerDto.username) {
      throw BusinessError.missingContactInfo();
    }

    await this.checkMerchantExists(registerDto);

    const hashedPassword = await bcrypt.hash(registerDto.password, 12);

    const user = await this.prisma.merchantUser.create({
      data: {
        ...registerDto,
        password: hashedPassword,
      },
    });

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
   * 发送注册用短信验证码
   */
  async sendRegistrationSmsCode(
    phone: string,
  ): Promise<{ message: string; phone: string }> {
    // 先检查手机号是否已被注册
    const existingUser = await this.prisma.merchantUser.findUnique({
      where: { phone },
    });
    if (existingUser) {
      throw BusinessError.phoneAlreadyExists();
    }

    // 调用SMS服务发送验证码
    await this.smsService.sendVerificationCode(phone);

    // 脱敏显示手机号
    const maskedPhone = phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');

    return {
      message: '验证码已发送',
      phone: maskedPhone,
    };
  }

  /**
   * 发送注册用邮箱验证码
   */
  async sendRegistrationEmailCode(email: string): Promise<{ message: string }> {
    // 先检查邮箱是否已被注册
    const existingUser = await this.prisma.merchantUser.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw BusinessError.emailAlreadyExists();
    }

    // 调用Email服务发送验证码
    await this.emailService.sendVerificationCode(email);

    return { message: '验证码已发送' };
  }

  /**
   * 商家手机验证码注册
   */
  async registerByPhoneCode(
    phone: string,
    code: string,
  ): Promise<LoginResponse> {
    // 验证短信验证码
    await this.smsService.verifyCode(phone, code);

    // 检查手机号是否已被注册
    const existingUser = await this.prisma.merchantUser.findUnique({
      where: { phone },
    });
    if (existingUser) {
      throw BusinessError.phoneAlreadyExists();
    }

    // 创建新的商家用户
    const user = await this.prisma.merchantUser.create({
      data: {
        phone,
        phoneVerified: true,
        password: '', // 验证码注册时密码为空
        status: 'ACTIVE',
      },
    });

    // 生成访问令牌和刷新令牌
    const tokens = await this.generateTokens(user.id, UserRole.MERCHANT);

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
   * 商家邮箱验证码注册
   */
  async registerByEmailCode(
    email: string,
    code: string,
  ): Promise<LoginResponse> {
    // 验证邮箱验证码
    await this.emailService.verifyEmailCode(email, code);

    // 检查邮箱是否已被注册
    const existingUser = await this.prisma.merchantUser.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw BusinessError.emailAlreadyExists();
    }

    // 创建新的商家用户
    const user = await this.prisma.merchantUser.create({
      data: {
        email,
        emailVerified: true,
        password: '', // 验证码注册时密码为空
        status: 'ACTIVE',
      },
    });

    // 生成访问令牌和刷新令牌
    const tokens = await this.generateTokens(user.id, UserRole.MERCHANT);

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
   * 商家手机验证码登录
   */
  async loginByPhoneCode(phone: string, code: string): Promise<LoginResponse> {
    // 验证短信验证码
    await this.smsService.verifyCode(phone, code);

    // 查找商家用户
    const user = await this.prisma.merchantUser.findFirst({
      where: {
        phone,
        status: 'ACTIVE',
        phoneVerified: true,
      },
    });

    if (!user) {
      throw BusinessError.userNotFound('手机号未注册或未验证');
    }

    // 生成JWT双令牌
    const tokens = await this.generateTokens(user.id, UserRole.MERCHANT);

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
   * 商家邮箱验证码登录
   */
  async loginByEmailCode(email: string, code: string): Promise<LoginResponse> {
    // 验证邮箱验证码
    await this.emailService.verifyEmailCode(email, code);

    // 查找商家用户
    const user = await this.prisma.merchantUser.findFirst({
      where: {
        email,
        status: 'ACTIVE',
        emailVerified: true,
      },
    });

    if (!user) {
      throw BusinessError.userNotFound('邮箱未注册或未验证');
    }

    // 生成JWT双令牌
    const tokens = await this.generateTokens(user.id, UserRole.MERCHANT);

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
   * 绑定手机号到商家账户
   */
  async bindPhone(
    userId: string,
    phone: string,
    code: string,
  ): Promise<{ message: string }> {
    // 验证短信验证码
    await this.smsService.verifyCode(phone, code);

    // 检查手机号是否已被其他用户使用
    const existingUser = await this.prisma.merchantUser.findUnique({
      where: { phone },
    });
    if (existingUser && existingUser.id !== userId) {
      throw BusinessError.phoneAlreadyExists();
    }

    // 更新用户手机号
    await this.prisma.merchantUser.update({
      where: { id: userId },
      data: {
        phone,
        phoneVerified: true,
      },
    });

    // 清除用户缓存
    await this.clearUserCache(userId, UserRole.MERCHANT);

    return { message: '手机号绑定成功' };
  }

  /**
   * 绑定邮箱到商家账户
   */
  async bindEmail(
    userId: string,
    email: string,
    code: string,
  ): Promise<{ message: string }> {
    // 验证邮箱验证码
    await this.emailService.verifyEmailCode(email, code);

    // 检查邮箱是否已被其他用户使用
    const existingUser = await this.prisma.merchantUser.findUnique({
      where: { email },
    });
    if (existingUser && existingUser.id !== userId) {
      throw BusinessError.emailAlreadyExists();
    }

    // 更新用户邮箱
    await this.prisma.merchantUser.update({
      where: { id: userId },
      data: {
        email,
        emailVerified: true,
      },
    });

    // 清除用户缓存
    await this.clearUserCache(userId, UserRole.MERCHANT);

    return { message: '邮箱绑定成功' };
  }

  /**
   * 设置商家账号密码(用户名+密码)
   */
  async setAccount(
    userId: string,
    username: string,
    password: string,
  ): Promise<{ message: string }> {
    // 检查用户名是否已被使用
    const existingUser = await this.prisma.merchantUser.findUnique({
      where: { username },
    });
    if (existingUser && existingUser.id !== userId) {
      throw BusinessError.usernameAlreadyExists();
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 12);

    // 更新用户名和密码
    await this.prisma.merchantUser.update({
      where: { id: userId },
      data: {
        username,
        password: hashedPassword,
      },
    });

    // 清除用户缓存
    await this.clearUserCache(userId, UserRole.MERCHANT);

    return { message: '账号密码设置成功' };
  }

  /**
   * 设置商家安全密码
   */
  async setSecurityPassword(
    userId: string,
    securityPassword: string,
  ): Promise<{ message: string }> {
    // 加密安全密码
    const hashedSecurityPassword = await bcrypt.hash(securityPassword, 12);

    // 更新安全密码
    await this.prisma.merchantUser.update({
      where: { id: userId },
      data: {
        securityPassword: hashedSecurityPassword,
      },
    });

    // 清除用户缓存
    await this.clearUserCache(userId, UserRole.MERCHANT);

    return { message: '安全密码设置成功' };
  }

  /**
   * 验证商家安全密码
   */
  async verifySecurityPassword(
    userId: string,
    securityPassword: string,
  ): Promise<{ message: string }> {
    // 获取用户信息
    const user = await this.prisma.merchantUser.findUnique({
      where: { id: userId },
      select: { securityPassword: true },
    });

    if (!user || !user.securityPassword) {
      throw new BadRequestException('请先设置安全密码');
    }

    // 验证安全密码
    const isValid = await bcrypt.compare(
      securityPassword,
      user.securityPassword,
    );
    if (!isValid) {
      throw new BadRequestException('安全密码错误');
    }

    return { message: '验证成功' };
  }

  /**
   * 获取商家认证状态信息
   */
  async getAuthProfile(userId: string): Promise<{
    hasAccount: boolean;
    hasPhone: boolean;
    phoneVerified: boolean;
    hasEmail: boolean;
    emailVerified: boolean;
    hasSecurityPassword: boolean;
  }> {
    // 获取用户信息
    const user = await this.prisma.merchantUser.findUnique({
      where: { id: userId },
      select: {
        username: true,
        password: true,
        phone: true,
        phoneVerified: true,
        email: true,
        emailVerified: true,
        securityPassword: true,
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return {
      hasAccount: !!(
        user.username &&
        user.password &&
        user.password.length > 0
      ),
      hasPhone: !!user.phone,
      phoneVerified: user.phoneVerified,
      hasEmail: !!user.email,
      emailVerified: user.emailVerified,
      hasSecurityPassword: !!user.securityPassword,
    };
  }

  /**
   * 查找商家用户
   */
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

  /**
   * 检查商家是否已存在
   */
  private async checkMerchantExists(registerDto: RegisterDto): Promise<void> {
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
  }
}
