/**
 * 客户认证服务
 *
 * TODO: 客户认证功能暂时未实现，保留空结构用于未来扩展
 */

import { Injectable } from '@nestjs/common';
import { BaseAuthService } from './base-auth.service';

@Injectable()
export class CustomerAuthService extends BaseAuthService {
  // TODO: 未来将添加客户认证相关方法
  // 可参考merchant-auth.service的实现方式
}
