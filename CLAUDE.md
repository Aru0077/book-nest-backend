# BookNest Backend - Claude AI 开发指南

## 项目概览

### 基本信息
- **项目名称**: BookNest Backend API
- **技术栈**: NestJS 11 + TypeScript
- **架构模式**: 精简高效的企业级REST API
- **开发原则**: 避免过度设计，优选官方解决方案

### 业务背景
BookNest 是一个酒店预订平台，单一后端服务支持三个角色的前端应用：
- **Admin前端**: 管理员管理所有商家、订单和结算
- **Merchant前端**: 商家管理宾馆信息、房间状态和订单
- **Customer前端**: 客户搜索宾馆、查看房间和下单

## 当前项目状态

### ✅ 已完成的基础架构
1. **核心配置**
   - NestJS 11项目初始化
   - TypeScript严格模式配置
   - 环境变量管理 (@nestjs/config)
   - 路径别名配置 (@/* 代表 src/*)

2. **安全与性能**
   - Helmet安全中间件
   - CORS跨域配置
   - 请求速率限制 (100次/分钟)
   - Gzip压缩中间件
   - 全局输入验证管道

3. **全局组件**
   - 异常过滤器：统一错误响应格式
   - 响应拦截器：统一成功响应格式
   - 认证守卫：JWT认证准备(未激活)
   - 请求日志中间件：精简HTTP访问日志

4. **开发工具**
   - Swagger API文档 (http://localhost:3000/api)
   - ESLint + Prettier代码规范
   - 健康检查端点 (/health)

### 📋 待开发功能
- 数据库集成 (Prisma + PostgreSQL)
- JWT认证与授权系统
- 业务模块 (Admin/Merchant/Customer)
- 缓存集成 (Redis)

## 技术架构

### 项目结构
```
backend/
├── src/
│   ├── common/                    # 公共组件
│   │   ├── decorators/           # @Public装饰器
│   │   ├── filters/              # 全局异常过滤器
│   │   ├── guards/               # 认证守卫
│   │   ├── interceptors/         # 响应格式拦截器
│   │   └── middleware/           # 日志中间件
│   ├── modules/                  # 业务模块
│   │   └── health/              # 健康检查模块
│   ├── app.module.ts            # 应用主模块
│   └── main.ts                  # 应用入口
├── .env                         # 环境配置
├── tsconfig.json               # TypeScript配置
└── eslint.config.mjs           # ESLint配置
```

### 核心依赖包
```json
{
  "@nestjs/common": "^11.0.1",
  "@nestjs/config": "^4.0.2", 
  "@nestjs/core": "^11.0.1",
  "@nestjs/swagger": "^11.2.0",
  "@nestjs/throttler": "^6.4.0",
  "class-transformer": "^0.5.1",
  "class-validator": "^0.14.2",
  "compression": "^1.8.1",
  "helmet": "^8.1.0"
}
```

## API设计规范

### 统一响应格式

**成功响应:**
```typescript
interface ApiResponse<T> {
  data: T;
  code: number;        // HTTP状态码
  message: string;     // 固定为 "Request successful"
  timestamp: string;   // ISO时间戳
}
```

**错误响应:**
```typescript
interface ErrorResponse {
  code: number;        // HTTP错误码
  timestamp: string;   // ISO时间戳
  path: string;        // 请求路径
  method: string;      // HTTP方法
  message: string;     // 错误信息
  error?: any;         // 详细错误对象(可选)
}
```

### API路由规划
```
/api/v1/admin/*     - 管理员API
/api/v1/merchant/*  - 商家API  
/api/v1/customer/*  - 客户API
/api/v1/common/*    - 公共API
/health             - 健康检查
/api                - Swagger文档
```

## 开发指南

### 环境配置
```env
# Application
NODE_ENV=development
PORT=3000

# Security  
CORS_ORIGIN=http://localhost:3000

# Database (待配置)
DATABASE_URL=postgresql://username:password@localhost:5432/book_nest_db

# JWT (待配置)
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
```

### 常用命令
```bash
# 开发启动
npm run start:dev

# 构建项目
npm run build

# 代码检查
npm run lint

# 代码格式化
npm run format

# 生产启动
npm run start:prod
```

### 开发规范

**1. 控制器开发模板:**
```typescript
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';

@ApiTags('example')
@Controller('example')
export class ExampleController {
  @Get()
  @Public() // 公开接口，不需要认证
  @ApiOperation({ summary: '获取示例数据' })
  @ApiResponse({ status: 200, description: '成功返回数据' })
  getExample() {
    return { message: 'Hello World' };
  }
}
```

**2. DTO验证模板:**
```typescript
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateExampleDto {
  @ApiProperty({ description: '名称' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: '描述', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}
```

**3. 日志使用:**
```typescript
import { Logger } from '@nestjs/common';

export class ExampleService {
  private readonly logger = new Logger(ExampleService.name);

  someMethod() {
    this.logger.log('操作执行');
    this.logger.warn('警告信息');
    this.logger.error('错误信息');
  }
}
```

## 注意事项

### 设计原则
- ✅ **精简高效**: 避免过度设计，优选NestJS官方方案
- ✅ **类型安全**: 充分利用TypeScript类型检查
- ✅ **统一规范**: 统一的响应格式和错误处理
- ✅ **安全第一**: 适当的认证授权和输入验证

### 开发约束
- 使用NestJS内置Logger，不引入第三方日志库
- 响应格式使用`code`字段而非`statusCode`
- 路径别名`@/*`指向`src/*`目录
- 所有API接口必须添加Swagger文档注解
- 遵循ESLint规则，保持代码质量

### 下一步开发优先级
1. **Prisma数据库集成** - 设计数据模型
2. **JWT认证系统** - 完善认证守卫
3. **核心业务模块** - Admin/Merchant/Customer
4. **Redis缓存** - 性能优化
5. **单元测试** - 代码质量保证

## 快速开始

### 启动开发环境
```bash
cd /Users/code/book-nest/backend
npm run start:dev
```

### 访问服务
- API服务: http://localhost:3000
- 健康检查: http://localhost:3000/health  
- API文档: http://localhost:3000/api

### 验证功能
```bash
# 测试健康检查
curl http://localhost:3000/health

# 测试错误处理
curl http://localhost:3000/health/error
```

---

**创建时间**: 2025-08-31  
**版本**: v1.0  
**维护者**: Claude AI Assistant