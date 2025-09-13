import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Dm20151123, * as $Dm20151123 from '@alicloud/dm20151123';
import * as $OpenApi from '@alicloud/openapi-client';
import * as $Util from '@alicloud/tea-util';
import { RedisService } from '@/redis/redis.service';
import { AppConfig } from '@/config/configuration';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly client: Dm20151123;
  private readonly config: AppConfig['email'];

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    // 获取邮件配置
    this.config = this.configService.get<AppConfig['email']>('app.email')!;

    // 初始化阿里云DirectMail客户端（基于官方示例）
    this.client = this.createClient();
  }

  /**
   * 创建阿里云DirectMail客户端 (基于官方示例实现)
   * 支持多种鉴权方式，更多信息请参见：https://help.aliyun.com/document_detail/378664.html
   */
  private createClient(): Dm20151123 {
    const config = new $OpenApi.Config({
      // 如果配置了AccessKey，则使用AccessKey方式
      accessKeyId: this.config.accessKeyId || undefined,
      accessKeySecret: this.config.accessKeySecret || undefined,
    });
    // Endpoint 请参考 https://api.aliyun.com/product/Dm
    config.endpoint = this.config.endpoint;
    return new Dm20151123(config);
  }

  /**
   * 发送验证码邮件
   */
  async sendVerificationCode(email: string): Promise<boolean> {
    try {
      // 检查必需的配置参数
      if (!this.config.accountName) {
        this.logger.error(
          `Email配置错误: accountName=${this.config.accountName}`,
        );
        throw new BadRequestException('邮件服务配置错误');
      }

      // 生成6位随机验证码
      const code = Math.random().toString().slice(2, 8).padEnd(6, '0');

      // 发送邮件
      await this.sendEmail(
        email,
        'BookNest - 邮箱验证码',
        this.getVerificationHtml(code),
      );

      // 存储验证码到Redis (5分钟有效期)
      const codeKey = `email:code:${email}`;
      await this.redisService.set(codeKey, code, 300);

      this.logger.log(`发送验证邮件成功: ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`发送验证邮件异常: ${String(error)}`);
      throw new BadRequestException('发送邮件失败，请稍后再试');
    }
  }

  /**
   * 验证邮箱验证码
   */
  async verifyEmailCode(email: string, code: string): Promise<boolean> {
    const codeKey = `email:code:${email}`;
    const storedCode = await this.redisService.get(codeKey);

    if (!storedCode) {
      throw new BadRequestException('验证码已过期或不存在');
    }

    if (storedCode !== code) {
      throw new BadRequestException('验证码错误');
    }

    // 验证成功后删除验证码
    await this.redisService.del(codeKey);
    this.logger.log(`邮箱验证码验证成功: ${email}`);
    return true;
  }

  /**
   * 发送通知邮件
   */
  async sendNotification(
    email: string,
    subject: string,
    message: string,
  ): Promise<boolean> {
    try {
      await this.sendEmail(
        email,
        subject,
        `<div style="padding:20px;font-family:Arial,sans-serif;"><p>${message}</p></div>`,
      );
      this.logger.log(`发送通知邮件成功: ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`发送通知邮件异常: ${String(error)}`);
      throw new BadRequestException('发送邮件失败，请稍后再试');
    }
  }

  /**
   * 基础邮件发送方法 (基于官方示例)
   */
  private async sendEmail(
    toAddress: string,
    subject: string,
    htmlBody: string,
  ): Promise<void> {
    const singleSendMailRequest = new $Dm20151123.SingleSendMailRequest({
      accountName: this.config.accountName,
      fromAlias: this.config.fromAlias,
      addressType: 1, // 发信地址
      toAddress,
      subject,
      htmlBody,
      replyToAddress: false,
    });

    const runtime = new $Util.RuntimeOptions({});

    try {
      const response = await this.client.singleSendMailWithOptions(
        singleSendMailRequest,
        runtime,
      );

      // 详细记录响应信息用于调试
      this.logger.log(`邮件API响应: ${JSON.stringify(response.body)}`);

      // 检查HTTP状态码
      if (response.statusCode !== 200) {
        throw new Error(`发送失败: HTTP ${response.statusCode}`);
      }

      // 根据官方文档，成功响应包含envId字段
      if (!response.body?.envId) {
        const message = String(
          response.body?.Message || response.body?.message || '未知错误',
        );
        throw new Error(`发送失败: ${message}`);
      }

      // 发送成功
      this.logger.log(
        `邮件发送成功: ${toAddress}, envId: ${response.body.envId}`,
      );
    } catch (error) {
      // 官方推荐的错误处理方式
      this.logger.error(`邮件发送失败: ${String(error)}`);
      throw error;
    }
  }

  /**
   * 获取验证码邮件HTML模板
   */
  private getVerificationHtml(code: string): string {
    return `
      <div style="padding:30px;font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#333;text-align:center;">BookNest 邮箱验证</h2>
        <div style="background:#f5f5f5;padding:20px;border-radius:8px;text-align:center;margin:20px 0;">
          <span style="font-size:24px;font-weight:bold;color:#007bff;letter-spacing:3px;">${code}</span>
        </div>
        <p style="color:#666;">验证码5分钟内有效，请及时使用。如果这不是您本人的操作，请忽略此邮件。</p>
      </div>
    `;
  }
}
