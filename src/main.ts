import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import * as express from 'express';
import { AppModule } from './app.module';
import { AppConfig } from '@/config/configuration';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  const configService = app.get(ConfigService);

  app.setGlobalPrefix(configService.get<string>('apiPrefix', 'api/v1'));

  // Security middleware
  app.use(helmet());

  // 简化Express中间件配置，避免类型转换冲突
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // 原始请求体大小限制（用于文件上传等）
  app.use(
    express.raw({
      limit: '50mb', // 文件上传限制更大
      type: ['application/octet-stream', 'multipart/form-data'],
    }),
  );

  // CORS configuration
  app.enableCors({
    origin: configService.get<string>(
      'app.corsOrigin',
      'http://localhost:3000',
    ),
    credentials: true,
  });

  // Compression middleware
  app.use(compression());

  // Global validation pipe - 修复配置冲突，保持安全标准
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 只允许DTO中定义的属性
      forbidNonWhitelisted: true, // 拒绝未定义的属性
      forbidUnknownValues: true, // 防止CVE-2019-18413安全漏洞
      transform: true, // 启用自动类型转换
      validateCustomDecorators: true, // 验证自定义装饰器
      stopAtFirstError: false, // 显示所有验证错误
      skipMissingProperties: false, // 不跳过缺失的属性
      skipNullProperties: false, // 不跳过null属性
      skipUndefinedProperties: false, // 不跳过undefined属性
      dismissDefaultMessages: false, // 不忽略默认错误消息
      validationError: {
        target: false, // 不在错误中包含target对象
        value: false, // 不在错误中包含value
      },
      // 移除transformOptions以避免类型转换冲突
    }),
  );

  // Swagger documentation
  const swaggerConfig = configService.get<AppConfig['swagger']>('app.swagger')!;
  const config = new DocumentBuilder()
    .setTitle(swaggerConfig.title)
    .setDescription(swaggerConfig.description)
    .setVersion(swaggerConfig.version)
    .addTag('auth', '认证相关接口')
    .addTag('admin', '管理员接口')
    .addTag('merchant', '商家接口')
    .addTag('customer', '客户接口')
    .addTag('health', '健康检查')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = configService.get<number>('app.port', 3000);
  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(
    `Swagger documentation available at: http://localhost:${port}/api`,
  );
}

void bootstrap();
