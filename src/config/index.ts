import { ConfigModuleOptions } from '@nestjs/config';
import { appConfig } from './configuration';

/**
 * 配置模块统一导出
 * 遵循NestJS官方最佳实践 - 精简高效
 */

// 导出配置加载器
export { appConfig };

// 配置模块选项 - NestJS官方推荐的简洁配置
export const configOptions: ConfigModuleOptions = {
  isGlobal: true,
  load: [appConfig],
  envFilePath: ['.env.local', '.env'],
  cache: true,
  expandVariables: true,
};

// 配置键名常量，用于类型安全的配置访问
export const CONFIG_KEYS = {
  APP: 'app',
} as const;
