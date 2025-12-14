# Netlify 部署指南

## 🚀 快速部署

### 方法 1: 通过 Netlify UI（推荐新手）

1. **创建 Netlify 账号**
   - 访问 https://app.netlify.com/signup
   - 可以使用 GitHub/GitLab/Bitbucket 账号登录

2. **连接 Git 仓库**
   - 点击"Add new site" → "Import an existing project"
   - 选择 Git 提供商（GitHub/GitLab/Bitbucket）
   - 授权 Netlify 访问你的仓库
   - 选择要部署的仓库

3. **配置构建设置**
   ```
   Build command: npm run build
   Publish directory: dist
   ```
   （这些设置已在 netlify.toml 中配置，会自动读取）

4. **设置环境变量**
   - 在 Site settings → Environment variables 中添加：
   ```
   VITE_SUPABASE_URL=你的Supabase项目URL
   VITE_SUPABASE_ANON_KEY=你的Supabase匿名密钥
   VITE_AI_API_KEY=AI服务API密钥（可选）
   VITE_APP_VERSION=1.0.0
   ```

5. **开始部署**
   - 点击"Deploy site"
   - 等待构建完成（约 2-5 分钟）
   - 访问分配的 URL（如 `https://your-app.netlify.app`）

---

### 方法 2: 通过 Netlify CLI（推荐开发者）

1. **安装 Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **登录 Netlify**
   ```bash
   netlify login
   ```

3. **初始化项目**
   ```bash
   netlify init
   ```
   选择：
   - "Create & configure a new site"
   - 选择团队
   - 输入站点名称（可选）
   - 确认构建命令和发布目录

4. **设置环境变量**
   ```bash
   # 交互式设置
   netlify env:set VITE_SUPABASE_URL "your-supabase-url"
   netlify env:set VITE_SUPABASE_ANON_KEY "your-anon-key"
   netlify env:set VITE_AI_API_KEY "your-ai-api-key"

   # 或者从 .env 文件批量导入
   netlify env:import .env
   ```

5. **本地预览构建**
   ```bash
   netlify build
   netlify dev
   ```

6. **部署**
   ```bash
   # 部署到草稿（预览）
   netlify deploy

   # 部署到生产环境
   netlify deploy --prod
   ```

---

### 方法 3: 通过 GitHub Actions（CI/CD）

1. **在 GitHub 仓库中创建 `.github/workflows/deploy.yml`**
   ```yaml
   name: Deploy to Netlify

   on:
     push:
       branches:
         - main
     pull_request:

   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3

         - name: Setup Node.js
           uses: actions/setup-node@v3
           with:
             node-version: '18'
             cache: 'npm'

         - name: Install dependencies
           run: npm ci

         - name: Build
           run: npm run build
           env:
             VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
             VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
             VITE_AI_API_KEY: ${{ secrets.VITE_AI_API_KEY }}

         - name: Deploy to Netlify
           uses: nwtgck/actions-netlify@v2.0
           with:
             publish-dir: './dist'
             production-branch: main
             github-token: ${{ secrets.GITHUB_TOKEN }}
             deploy-message: "Deploy from GitHub Actions"
           env:
             NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
             NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
   ```

2. **在 GitHub 仓库设置中添加 Secrets**
   - Settings → Secrets and variables → Actions
   - 添加以下 secrets:
     - `NETLIFY_AUTH_TOKEN`: 从 Netlify User settings → Applications → Personal access tokens 获取
     - `NETLIFY_SITE_ID`: 从 Netlify Site settings → General → Site details → Site ID 获取
     - `VITE_SUPABASE_URL`: 你的 Supabase 项目 URL
     - `VITE_SUPABASE_ANON_KEY`: 你的 Supabase 匿名密钥
     - `VITE_AI_API_KEY`: AI 服务 API 密钥

3. **推送代码触发部署**
   ```bash
   git push origin main
   ```

---

## 🔑 环境变量配置

### 必需的环境变量

| 变量名 | 描述 | 示例 |
|--------|------|------|
| `VITE_SUPABASE_URL` | Supabase 项目 URL | `https://xxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase 匿名密钥 | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` |

### 可选的环境变量

| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| `VITE_AI_API_KEY` | AI 服务 API 密钥 | - |
| `VITE_APP_VERSION` | 应用版本号 | `1.0.0` |
| `NODE_VERSION` | Node.js 版本 | `18` |

### 如何获取 Supabase 凭证

1. 登录 Supabase 控制台 https://app.supabase.com
2. 选择你的项目
3. 进入 Settings → API
4. 复制以下信息：
   - Project URL → `VITE_SUPABASE_URL`
   - anon public key → `VITE_SUPABASE_ANON_KEY`

---

## 🎯 自定义域名配置

### 1. 在 Netlify 添加自定义域名

1. 进入 Site settings → Domain management
2. 点击"Add custom domain"
3. 输入你的域名（如 `demo.yourdomain.com`）
4. 按照提示验证域名所有权

### 2. 配置 DNS 记录

**选项 A: 使用 Netlify DNS（推荐）**
- 将域名的 Nameservers 指向 Netlify 提供的 NS 记录
- Netlify 会自动管理所有 DNS 记录

**选项 B: 使用外部 DNS**
- 添加 A 记录或 CNAME 记录指向 Netlify
- A 记录: `75.2.60.5`
- CNAME 记录: `your-site.netlify.app`

### 3. 启用 HTTPS

- Netlify 会自动为自定义域名申请 Let's Encrypt SSL 证书
- 等待几分钟后，HTTPS 就会生效
- 可以在 Domain settings 中启用"Force HTTPS"

---

## ⚙️ 构建配置说明

### netlify.toml 文件解析

```toml
[build]
  command = "npm run build"    # 构建命令
  publish = "dist"              # 输出目录
  environment = { NODE_VERSION = "18" }  # Node.js 版本

# SPA 路由配置
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200                  # 所有路由重定向到 index.html
```

### 构建优化

1. **启用构建缓存**
   ```toml
   [build]
     command = "npm ci && npm run build"
   ```

2. **优化构建时间**
   - 使用 `npm ci` 代替 `npm install`（更快，确定性）
   - 启用依赖缓存
   - 减少构建日志输出

3. **构建环境变量**
   ```toml
   [build.environment]
     NODE_OPTIONS = "--max-old-space-size=4096"  # 增加 Node.js 内存限制
     NPM_FLAGS = "--legacy-peer-deps"             # 处理依赖冲突
   ```

---

## 🔄 部署预览（Deploy Previews）

### 什么是部署预览？

- 每次创建 Pull Request 时，Netlify 会自动创建一个预览环境
- 预览环境有独立的 URL，不影响生产环境
- 适合团队协作和代码审查

### 配置部署预览

```toml
[context.deploy-preview]
  command = "npm run build"

[context.deploy-preview.environment]
  VITE_APP_ENV = "preview"
```

### 使用部署预览

1. 创建 Pull Request
2. Netlify 会在 PR 中添加评论，包含预览 URL
3. 点击 URL 查看预览效果
4. 合并 PR 后，预览环境会自动清理

---

## 🔍 构建日志调试

### 查看构建日志

1. 进入 Netlify 控制台
2. 选择 Deploys
3. 点击具体的部署记录
4. 查看详细的构建日志

### 常见构建错误

**错误 1: 依赖安装失败**
```
Error: Cannot find module 'xxx'
```
**解决方案**:
- 确认 package.json 中包含所有依赖
- 运行 `npm install` 确保 package-lock.json 是最新的
- 提交 package-lock.json 到仓库

**错误 2: 构建超时**
```
Error: Build exceeded maximum allowed runtime
```
**解决方案**:
- 优化构建脚本
- 减少不必要的依赖
- 升级 Netlify 计划（免费版限制 10 分钟）

**错误 3: 环境变量未设置**
```
Error: VITE_SUPABASE_URL is not defined
```
**解决方案**:
- 在 Netlify 控制台添加环境变量
- 检查变量名拼写是否正确
- 确认变量在正确的作用域（生产/预览）

**错误 4: TypeScript 类型错误**
```
Error: Type 'X' is not assignable to type 'Y'
```
**解决方案**:
- 本地运行 `npm run type-check` 修复类型错误
- 或在 netlify.toml 中跳过类型检查（不推荐）

---

## 🚀 性能优化建议

### 1. 启用 Netlify 加速功能

**Asset Optimization（资产优化）**
- 自动压缩图片
- 自动压缩 CSS/JS
- 启用方式: Site settings → Build & deploy → Post processing

**Prerendering（预渲染）**
- 为静态页面生成 HTML 快照
- 提高 SEO 和首屏加载速度
- 启用方式: Site settings → Build & deploy → Prerendering

**形象文件处理**
- 使用 Netlify 形象 CDN
- 自动转换为 WebP 格式
- 响应式图片优化

### 2. CDN 配置

Netlify 自带全球 CDN，无需额外配置。

**缓存策略**:
```toml
[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*.html"
  [headers.values]
    Cache-Control = "public, max-age=0, must-revalidate"
```

### 3. 代码分割和懒加载

确保在代码中使用了 React 的懒加载：
```typescript
const Component = lazy(() => import('./Component'));
```

---

## 📊 监控和分析

### 1. Netlify Analytics

- 实时访问统计
- 页面浏览量
- 独立访客数
- 带宽使用情况

启用方式: Site settings → Analytics

### 2. 集成第三方分析

**Google Analytics**
```html
<!-- 在 index.html 中添加 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
```

**Sentry 错误追踪**
```bash
npm install @sentry/react
```

### 3. 性能监控

使用 Lighthouse CI 进行持续性能监控：
```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI
on: [push]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v9
```

---

## 🔐 安全最佳实践

### 1. 环境变量安全

- ✅ 使用 `VITE_` 前缀的变量会暴露到客户端
- ⚠️ 不要在前端代码中存储敏感密钥
- ✅ 使用 Supabase RLS 保护数据库

### 2. Headers 配置

已在 netlify.toml 中配置：
```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "no-referrer"
    X-XSS-Protection = "1; mode=block"
```

### 3. HTTPS 强制跳转

在 Netlify 控制台启用:
- Domain settings → HTTPS → Force HTTPS

---

## 🆘 故障排查

### 问题 1: 页面 404

**症状**: 刷新页面或直接访问子路由时显示 404

**原因**: SPA 路由配置问题

**解决**:
确认 netlify.toml 中有以下配置：
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 问题 2: 环境变量不生效

**症状**: 应用运行时提示环境变量未定义

**原因**:
1. 环境变量未在 Netlify 中设置
2. 变量名拼写错误
3. 构建后未重新部署

**解决**:
1. 在 Netlify 控制台检查环境变量
2. 修改环境变量后需要重新部署
3. 使用 `console.log(import.meta.env)` 调试

### 问题 3: 部署后白屏

**症状**: 部署成功，但访问页面显示白屏

**原因**:
1. JavaScript 错误
2. 资源加载失败
3. 路由配置错误

**解决**:
1. 打开浏览器控制台查看错误
2. 检查 Network 标签查看资源加载情况
3. 检查 base URL 配置是否正确

### 问题 4: 构建失败

**症状**: 部署时构建过程失败

**常见原因和解决方案**:
```bash
# 原因 1: 依赖版本冲突
npm install --legacy-peer-deps

# 原因 2: 内存不足
# 在 netlify.toml 中增加内存
[build.environment]
  NODE_OPTIONS = "--max-old-space-size=4096"

# 原因 3: TypeScript 类型错误
npm run type-check  # 本地修复错误
```

---

## 📞 支持资源

- **Netlify 文档**: https://docs.netlify.com
- **Netlify 社区**: https://answers.netlify.com
- **Netlify Status**: https://www.netlifystatus.com
- **本项目 Issues**: [GitHub Issues 链接]

---

## 🎉 部署成功后的检查清单

- [ ] 访问生产 URL，确认页面正常显示
- [ ] 测试所有主要功能
- [ ] 检查图片和资源是否正确加载
- [ ] 测试路由跳转（前进/后退/刷新）
- [ ] 在移动设备上测试（响应式）
- [ ] 检查浏览器控制台是否有错误
- [ ] 测试登录功能
- [ ] 测试数据库连接
- [ ] 验证环境变量是否生效
- [ ] 确认 HTTPS 证书已生效
- [ ] 设置自定义域名（可选）
- [ ] 配置分析工具（可选）
- [ ] 设置 webhook 通知（可选）

---

**文档版本**: v1.0
**最后更新**: 2024年12月
**维护者**: Claude Code Assistant

祝您部署顺利！🚀
