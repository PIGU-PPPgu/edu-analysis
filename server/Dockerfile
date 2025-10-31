# 后端API代理服务Dockerfile
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apk add --no-cache curl

# 复制包配置文件
COPY package*.json ./

# 设置npm配置（CI环境使用官方源，本地可覆盖）
ARG NPM_REGISTRY=https://registry.npmjs.org/
RUN npm config set registry $NPM_REGISTRY

# 安装依赖
RUN npm ci --only=production=false --silent

# 复制源代码
COPY . .

# 暴露端口
EXPOSE 3001

# 设置环境变量
ENV NODE_ENV=development

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# 启动服务
CMD ["npm", "run", "dev"]