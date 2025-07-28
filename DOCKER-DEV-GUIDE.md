# Docker开发环境使用指南

## 🚀 快速开始

### 1. 启动完整开发环境
```bash
npm run docker:up
```

### 2. 验证环境状态
```bash
npm run docker:health
```

### 3. 访问服务
- **前端应用**: http://localhost:8080
- **后端API**: http://localhost:3001
- **Python服务**: http://localhost:5000

## 📋 可用命令

### 基础操作
```bash
# 启动所有服务
npm run docker:up

# 停止所有服务
npm run docker:down

# 构建所有镜像
npm run docker:build

# 重新构建并启动（推荐用于代码更新后）
npm run docker:rebuild

# 启动并构建（开发模式）
npm run docker:dev
```

### 监控和调试
```bash
# 查看所有服务日志
npm run docker:logs

# 查看特定服务日志
npm run docker:logs:frontend
npm run docker:logs:backend
npm run docker:logs:python

# 健康检查
npm run docker:health

# 清理容器和数据
npm run docker:clean
```

## 🏗️ 服务架构

### frontend-dev (端口8080)
- **技术栈**: Vite + React + TypeScript
- **特性**: 热重载、TypeScript支持
- **数据卷**: 整个项目目录映射，支持实时编辑

### backend-api (端口3001)
- **技术栈**: Express.js + Node.js
- **功能**: API代理、CORS处理
- **健康检查**: `/health` 端点

### python-service (端口5000)
- **技术栈**: Flask + pandas
- **功能**: 数据处理、文件解析
- **认证**: Supabase JWT验证

### monitoring
- **功能**: 服务健康监控
- **监控频率**: 每60秒检查一次
- **输出**: 控制台状态报告

## 🔧 开发工作流

### 日常开发
1. 启动环境: `npm run docker:up`
2. 验证状态: `npm run docker:health`
3. 开始编码（自动热重载）
4. 查看日志: `npm run docker:logs`

### 代码更新后
```bash
# 方式1: 完全重建（推荐）
npm run docker:rebuild

# 方式2: 仅重启
npm run docker:down && npm run docker:up
```

### 问题排查
```bash
# 1. 检查服务状态
npm run docker:health

# 2. 查看具体服务日志
npm run docker:logs:frontend  # 前端问题
npm run docker:logs:backend   # 后端API问题
npm run docker:logs:python    # Python服务问题

# 3. 重新构建问题服务
docker-compose build <service-name>

# 4. 完全清理重来
npm run docker:clean
npm run docker:dev
```

## 🌐 网络配置

所有服务运行在 `figma-network` 网络中，服务间可通过服务名互相访问：

- `frontend-dev:8080`
- `backend-api:3001` 
- `python-service:5000`

## 📁 数据卷映射

### 前端服务
- 项目根目录 → `/app`
- `node_modules` 独立卷（性能优化）

### 后端服务
- `./server` → `/app`
- `node_modules` 独立卷

### Python服务
- `./python-data-processor` → `/app`

## 🔍 健康检查

### 自动健康检查
每个服务都配置了Docker健康检查：
- **间隔**: 30秒
- **超时**: 10秒
- **重试**: 3次

### 手动健康检查
```bash
npm run docker:health
```

检查内容：
- ✅ Docker环境状态
- ✅ 容器运行状态
- ✅ 端口占用情况
- ✅ 服务响应能力
- ✅ API功能测试

## 🚨 常见问题

### 1. 端口占用
```bash
# 检查端口占用
lsof -i :8080
lsof -i :3001
lsof -i :5000

# 停止占用进程
kill -9 <PID>
```

### 2. 服务启动失败
```bash
# 查看详细错误日志
docker-compose logs <service-name>

# 重新构建镜像
docker-compose build --no-cache <service-name>
```

### 3. 热重载不工作
```bash
# 检查文件监听配置
echo $CHOKIDAR_USEPOLLING
echo $WATCHPACK_POLLING

# 重启前端服务
docker-compose restart frontend-dev
```

### 4. Python服务认证失败
检查环境变量配置：
```bash
echo $SUPABASE_URL
echo $SUPABASE_ANON_KEY
```

## 📊 性能优化

### 1. 构建性能
- 使用多阶段构建
- 合理使用`.dockerignore`
- 缓存依赖安装层

### 2. 运行性能  
- 数据卷映射优化
- 资源限制配置
- 健康检查频率优化

### 3. 开发体验
- 热重载配置
- 源码映射
- 实时日志输出

## 🔐 环境变量

### 前端环境变量
- `NODE_ENV=development`
- `CHOKIDAR_USEPOLLING=true`
- `WATCHPACK_POLLING=true`

### Python服务环境变量
- `FLASK_ENV=development`
- `FLASK_DEBUG=1`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

## 📝 开发建议

1. **定期健康检查**: 每次开发前运行 `npm run docker:health`
2. **监控日志**: 使用 `npm run docker:logs` 实时监控
3. **及时重建**: 依赖更新后使用 `npm run docker:rebuild`
4. **资源清理**: 定期运行 `npm run docker:clean` 清理资源

## 🆘 技术支持

如遇问题，请提供：
1. 运行的命令
2. 健康检查输出 (`npm run docker:health`)
3. 相关服务日志
4. 系统环境信息