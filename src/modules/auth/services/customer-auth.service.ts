/**
 * 客户认证服务
 */

import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { BusinessError } from '@/common/exceptions';
import { BaseAuthService } from './base-auth.service';
import { LoginDto, LoginResponse, RegisterDto, UserRole } from '../auth.types';

@Injectable()
export class CustomerAuthService extends BaseAuthService {
  /**
   * 客户登录
   */
  async login(loginDto: LoginDto): Promise<LoginResponse> {
    const user = await this.findCustomerUser(loginDto.identifier);
    await this.validatePassword(loginDto.password, user.password!);

    const tokens = await this.generateTokens(
      user.id,
      UserRole.CUSTOMER,
      user.email || undefined,
    );

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
   * 客户注册
   */
  async register(registerDto: RegisterDto): Promise<LoginResponse> {
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

  /**
   * 查找客户用户
   */
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
}
