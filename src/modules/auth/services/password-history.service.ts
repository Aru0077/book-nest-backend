/**
 * 密码历史管理服务
 * 防止用户重复使用近期密码
 */

import { Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '@/prisma';
import { RedisService } from '@/redis';
import { BusinessError } from '@/common/exceptions';
import { UserRole } from '../auth.types';

@Injectable()
export class PasswordHistoryService {
  private readonly logger = new Logger(PasswordHistoryService.name);
  private readonly HISTORY_COUNT = 5; // 保存最近5个密码的历史记录
  private readonly HISTORY_TTL = 365 * 24 * 60 * 60; // 密码历史保存1年

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /**
   * 检查密码是否在历史记录中使用过
   * @param userId 用户ID
   * @param role 用户角色
   * @param newPassword 新密码（明文）
   * @throws BusinessError 如果密码在历史记录中使用过
   */
  async checkPasswordHistory(
    userId: string,
    role: UserRole,
    newPassword: string,
  ): Promise<void> {
    const historyKey = `password_history:${role}:${userId}`;

    try {
      // 从Redis获取密码历史记录
      const historyList = await this.redis.lrange(
        historyKey,
        0,
        this.HISTORY_COUNT - 1,
      );

      // 检查新密码是否与历史密码匹配
      for (const oldHashedPassword of historyList) {
        const isMatch = await bcrypt.compare(newPassword, oldHashedPassword);
        if (isMatch) {
          this.logger.warn(`用户 ${userId} 尝试重复使用历史密码`);
          throw BusinessError.weakPassword('不能使用最近使用过的密码');
        }
      }

      this.logger.debug(`密码历史检查通过: ${userId}`);
    } catch (error) {
      // 保持已知的业务异常
      if (
        error instanceof Error &&
        error.message.includes('不能使用最近使用过的密码')
      ) {
        throw error;
      }

      // Redis错误不应该阻止密码设置，只记录日志
      this.logger.error(
        `密码历史检查失败: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * 添加新密码到历史记录
   * @param userId 用户ID
   * @param role 用户角色
   * @param hashedPassword 加密后的新密码
   */
  async addPasswordToHistory(
    userId: string,
    role: UserRole,
    hashedPassword: string,
  ): Promise<void> {
    const historyKey = `password_history:${role}:${userId}`;

    try {
      // 使用Redis列表存储密码历史
      // lpush：在列表头部插入新密码
      await this.redis.lpush(historyKey, hashedPassword);

      // ltrim：保留最新的N个密码，删除多余的旧密码
      await this.redis.ltrim(historyKey, 0, this.HISTORY_COUNT - 1);

      // 设置过期时间
      await this.redis.expire(historyKey, this.HISTORY_TTL);

      this.logger.debug(`密码已添加到历史记录: ${userId}`);
    } catch (error) {
      // Redis错误不应该阻止密码设置，只记录日志
      this.logger.error(
        `添加密码历史失败: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * 清除用户的密码历史记录
   * @param userId 用户ID
   * @param role 用户角色
   */
  async clearPasswordHistory(userId: string, role: UserRole): Promise<void> {
    const historyKey = `password_history:${role}:${userId}`;

    try {
      await this.redis.del(historyKey);
      this.logger.debug(`密码历史记录已清除: ${userId}`);
    } catch (error) {
      this.logger.error(
        `清除密码历史失败: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * 获取密码历史记录数量
   * @param userId 用户ID
   * @param role 用户角色
   * @returns 历史记录数量
   */
  async getPasswordHistoryCount(
    userId: string,
    role: UserRole,
  ): Promise<number> {
    const historyKey = `password_history:${role}:${userId}`;

    try {
      return await this.redis.llen(historyKey);
    } catch (error) {
      this.logger.error(
        `获取密码历史数量失败: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      return 0;
    }
  }

  /**
   * 初始化用户密码历史（从数据库迁移现有密码）
   * 通常在用户首次登录或系统升级时调用
   * @param userId 用户ID
   * @param role 用户角色
   */
  async initializePasswordHistory(
    userId: string,
    role: UserRole,
  ): Promise<void> {
    try {
      let currentPassword: string | null = null;

      // 从数据库获取当前密码
      switch (role) {
        case UserRole.ADMIN: {
          const admin = await this.prisma.adminUser.findUnique({
            where: { id: userId },
            select: { password: true },
          });
          currentPassword = admin?.password || null;
          break;
        }

        case UserRole.MERCHANT: {
          const merchant = await this.prisma.merchantUser.findUnique({
            where: { id: userId },
            select: { password: true },
          });
          currentPassword = merchant?.password || null;
          break;
        }

        case UserRole.CUSTOMER: {
          const customer = await this.prisma.customerUser.findUnique({
            where: { id: userId },
            select: { password: true },
          });
          currentPassword = customer?.password || null;
          break;
        }
      }

      // 如果用户有当前密码，添加到历史记录中
      if (currentPassword) {
        await this.addPasswordToHistory(userId, role, currentPassword);
        this.logger.debug(`密码历史已初始化: ${userId}`);
      }
    } catch (error) {
      this.logger.error(
        `初始化密码历史失败: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
