# 依赖安装阶段
FROM node:22-alpine AS dependencies
WORKDIR /app

# 复制包管理文件
COPY package*.json ./
COPY prisma ./prisma/

# 安装所有依赖（包括开发依赖）
RUN npm ci

# 生成Prisma客户端
RUN npx prisma generate

# 应用构建阶段
FROM node:22-alpine AS builder
WORKDIR /app

# 复制依赖和源代码
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

# 构建应用
RUN npm run build

# 生产依赖安装阶段
FROM node:22-alpine AS production-deps
WORKDIR /app

# 复制包管理文件和Prisma配置
COPY package*.json ./
COPY prisma ./prisma/

# 仅安装生产依赖
RUN npm ci --only=production && npm cache clean --force

# 生成生产环境Prisma客户端
RUN npx prisma generate

# 最终生产镜像
FROM node:22-alpine AS production
WORKDIR /app

# 创建非特权用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs

# 复制生产依赖
COPY --from=production-deps --chown=nestjs:nodejs /app/node_modules ./node_modules

# 复制Prisma生成的客户端
COPY --from=production-deps --chown=nestjs:nodejs /app/prisma ./prisma

# 复制构建产物
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# 复制必要的配置文件
COPY --chown=nestjs:nodejs package*.json ./

# 安装运行时需要的工具
RUN apk add --no-cache wget

# 切换到非特权用户
USER nestjs

# 暴露应用端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health || exit 1

# 启动应用
CMD ["node", "dist/main.js"]