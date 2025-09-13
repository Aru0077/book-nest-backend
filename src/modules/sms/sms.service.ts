import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as $dara from '@darabonba/typescript';
import Dysmsapi20170525, * as $Dysmsapi20170525 from '@alicloud/dysmsapi20170525';
import { $OpenApiUtil } from '@alicloud/openapi-core';
import { RedisService } from '@/redis/redis.service';
import { AppConfig } from '@/config/configuration';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly client: Dysmsapi20170525;
  private readonly config: AppConfig['sms'];

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    // 获取短信配置
    this.config = this.configService.get<AppConfig['sms']>('app.sms')!;

    // 初始化阿里云SMS客户端（基于官方示例）
    this.client = this.createClient();
  }

  /**
   * 创建阿里云SMS客户端 (基于官方示例实现)
   * 支持多种鉴权方式，更多信息请参见：https://help.aliyun.com/document_detail/378664.html
   */
  private createClient(): Dysmsapi20170525 {
    const config = new $OpenApiUtil.Config({
      // 如果配置了AccessKey，则使用AccessKey方式
      accessKeyId: this.config.accessKeyId || undefined,
      accessKeySecret: this.config.accessKeySecret || undefined,
    });
    // Endpoint 请参考 https://api.aliyun.com/product/Dysmsapi
    config.endpoint = 'dysmsapi.aliyuncs.com';
    return new Dysmsapi20170525(config);
  }

  /**
   * 发送短信验证码
   * @param phone 手机号码
   * @returns 发送结果
   */
  async sendVerificationCode(phone: string): Promise<boolean> {
    try {
      // 检查发送频率限制 (60秒内不能重复发送)
      const rateLimitKey = `sms:rate_limit:${phone}`;
      const exists = await this.redisService.exists(rateLimitKey);
      if (exists) {
        throw new BadRequestException('发送过于频繁，请60秒后再试');
      }

      // 检查必需的配置参数
      if (!this.config.signName || !this.config.templateCode) {
        this.logger.error(
          `SMS配置错误: signName=${this.config.signName}, templateCode=${this.config.templateCode}`,
        );
        throw new BadRequestException('短信服务配置错误');
      }

      // 生成6位随机验证码
      const code = this.generateVerificationCode();

      // 发送短信（基于官方示例）
      const sendSmsRequest = new $Dysmsapi20170525.SendSmsRequest({
        phoneNumbers: phone,
        signName: this.config.signName,
        templateCode: this.config.templateCode,
        templateParam: JSON.stringify({ code }),
      });

      const runtime = new $dara.RuntimeOptions({});
      const response = await this.client.sendSmsWithOptions(
        sendSmsRequest,
        runtime,
      );

      if (response.body?.code === 'OK') {
        // 存储验证码到Redis (5分钟有效期)
        const codeKey = `sms:code:${phone}`;
        await this.redisService.set(codeKey, code, 300);

        // 设置发送频率限制 (60秒)
        await this.redisService.set(rateLimitKey, '1', 60);

        this.logger.log(`发送验证码成功: ${phone}`);
        return true;
      } else {
        this.logger.error(
          `发送短信失败: ${response.body?.message}`,
          response.body,
        );
        throw new BadRequestException(
          `发送失败: ${response.body?.message || '未知错误'}`,
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      // 使用官方推荐的错误处理方式
      if (error instanceof $dara.ResponseError) {
        const errorData = error.data as
          | { Recommend?: string; [key: string]: unknown }
          | undefined;
        this.logger.error(`发送短信失败: ${error.message}`, {
          data: errorData,
          recommend: errorData?.Recommend,
        });
        throw new BadRequestException(
          `发送失败: ${error.message || '短信服务异常'}`,
        );
      }

      const err = error as Error;
      this.logger.error(`发送短信异常: ${err.message}`, err.stack);
      throw new BadRequestException('发送短信失败，请稍后再试');
    }
  }

  /**
   * 验证短信验证码
   * @param phone 手机号码
   * @param code 验证码
   * @returns 验证结果
   */
  async verifyCode(phone: string, code: string): Promise<boolean> {
    try {
      const codeKey = `sms:code:${phone}`;
      const storedCode = await this.redisService.get(codeKey);

      if (!storedCode) {
        throw new BadRequestException('验证码已过期或不存在');
      }

      if (storedCode !== code) {
        throw new BadRequestException('验证码错误');
      }

      // 验证成功后删除验证码
      await this.redisService.del(codeKey);
      this.logger.log(`验证码验证成功: ${phone}`);
      return true;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const err = error as Error;
      this.logger.error(`验证码校验异常: ${err.message}`, err.stack);
      throw new BadRequestException('验证失败，请稍后再试');
    }
  }

  /**
   * 生成6位数字验证码
   * @returns 验证码
   */
  private generateVerificationCode(): string {
    return Math.random().toString().slice(2, 8).padEnd(6, '0');
  }
}
