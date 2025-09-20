/**
 * 客户认证控制器
 *
 * TODO: 客户认证功能暂时未实现，保留空结构用于未来扩展
 */

import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Customer Auth')
@Controller('/customer/auth')
export class CustomerAuthController {
  // TODO: 未来将添加客户认证相关接口
  // 可参考merchant-auth.controller的实现方式
}
