# 📋 代码质量标准文档

## 🎯 质量保证体系概览

本项目实施完整的代码质量保证体系，包含四层质量检查：**格式化 → 语法检查 → 类型检查 → 测试**。

### 🏗️ 工具链架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Prettier      │ -> │    ESLint       │ -> │   TypeScript    │ -> │     Vitest      │
│   代码格式化     │    │   语法检查       │    │   类型检查       │    │     测试        │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🛠️ 开发工具配置

### 1. TypeScript 严格模式

**配置位置**: `tsconfig.json`

✅ **启用的严格规则**:
- `"strict": true` - 启用所有严格类型检查
- `"noUnusedLocals": true` - 禁止未使用的局部变量
- `"noUnusedParameters": true` - 禁止未使用的参数
- `"noImplicitAny": true` - 禁止隐式any类型
- `"noFallthroughCasesInSwitch": true` - 禁止switch语句贯穿
- `"exactOptionalPropertyTypes": true` - 精确可选属性类型
- `"noImplicitReturns": true` - 禁止隐式返回
- `"noUncheckedIndexedAccess": true` - 禁止未检查的索引访问

### 2. ESLint 配置

**配置位置**: `eslint.config.js`

🔧 **规则级别**:
- **错误 (error)**: 阻止提交的严重问题
- **警告 (warn)**: 需要注意但不阻止提交
- **关闭 (off)**: 不检查

**核心规则**:
```javascript
// TypeScript 严格规则
"@typescript-eslint/no-unused-vars": "error"
"@typescript-eslint/no-explicit-any": "warn" 
"@typescript-eslint/prefer-nullish-coalescing": "error"

// 代码质量规则
"no-console": "warn"
"no-debugger": "error"
"prefer-const": "error"
"eqeqeq": ["error", "always"]

// React 规则
"react-hooks/exhaustive-deps": "error"
```

### 3. Prettier 格式化

**配置位置**: `.prettierrc`

📝 **格式化标准**:
- 使用分号: `"semi": true`
- 双引号: `"singleQuote": false`
- 行宽: `"printWidth": 80`
- 缩进: `"tabWidth": 2`
- 尾随逗号: `"trailingComma": "es5"`

### 4. Vitest 测试框架

**配置位置**: `vitest.config.ts`

🧪 **测试标准**:
- 全局测试环境: `jsdom`
- 代码覆盖率: 使用 `v8` 提供商
- 测试超时: `10000ms`
- 并行执行: 启用多线程

## 📜 质量检查脚本

### 基础脚本

```bash
# 代码格式化
npm run format              # 自动格式化代码
npm run format:check        # 检查格式化状态

# 语法检查
npm run lint                # ESLint检查
npm run lint:fix            # 自动修复ESLint问题

# 类型检查
npm run type-check          # TypeScript类型检查

# 测试
npm run test                # 交互式测试
npm run test:run            # 单次运行测试
npm run test:ui             # 测试UI界面
npm run test:coverage       # 覆盖率测试
```

### 质量门禁脚本

```bash
# 完整质量检查
npm run quality:check       # 完整质量检查流程

# 质量问题修复
npm run quality:fix         # 自动修复可修复的质量问题
```

## 🔒 Git Hooks 质量门禁

### Pre-commit Hook

**执行顺序**:
1. **格式化检查** - 确保代码符合格式标准
2. **ESLint检查** - 确保代码符合语法规范
3. **类型检查** - 确保TypeScript类型正确
4. **测试运行** - 确保所有测试通过

**失败处理**:
- 任何一步失败都会阻止提交
- 提供明确的错误信息和修复建议
- 自动化修复建议（如运行 `npm run quality:fix`）

## 📊 质量标准

### 🎯 代码质量指标

| 指标 | 标准 | 检查方式 |
|------|------|----------|
| ESLint 通过率 | 100% | `npm run lint` |
| TypeScript 类型错误 | 0个 | `npm run type-check` |
| 测试通过率 | 100% | `npm run test:run` |
| 代码格式化 | 100%一致 | `npm run format:check` |

### 🚫 质量阻止规则

**立即阻止提交的情况**:
- ESLint错误级别规则失败
- TypeScript编译错误
- 测试用例失败
- 代码格式不符合Prettier标准

**警告但允许提交的情况**:
- ESLint警告级别问题
- 部分代码覆盖率不足（但测试通过）

## 📝 开发工作流

### 1. 日常开发

```bash
# 开发前
npm run dev                 # 启动开发服务器

# 开发中（推荐设置编辑器自动格式化）
npm run format             # 定期格式化代码
npm run lint:fix           # 修复ESLint问题

# 开发后
npm run quality:check      # 提交前质量检查
```

### 2. 提交代码

```bash
git add .
git commit -m "feat: 添加新功能"
# 自动触发pre-commit hook
# 所有质量检查通过后才能成功提交
```

### 3. 持续集成

建议在CI/CD管道中添加相同的质量检查：

```yaml
# .github/workflows/quality.yml 示例
- name: Quality Check
  run: npm run quality:check
```

## 🔧 故障排除

### 常见问题及解决方案

#### 1. TypeScript 严格模式错误

**问题**: 启用严格模式后出现大量类型错误

**解决方案**:
```bash
# 逐步修复类型错误
npm run type-check          # 查看所有错误
# 修复一个文件后再次检查
npm run type-check
```

**常见修复模式**:
```typescript
// 修复前: 隐式any
function process(data) { }

// 修复后: 明确类型
function process(data: unknown) { }

// 修复前: 可能undefined
const value = data.field.name;

// 修复后: 安全访问
const value = data.field?.name;
```

#### 2. ESLint 规则冲突

**问题**: ESLint规则与项目需求冲突

**解决方案**:
```javascript
// eslint.config.js 中调整规则
rules: {
  "rule-name": "off",          // 关闭规则
  "rule-name": "warn",         // 降级为警告
  "rule-name": ["error", {...options}]  // 自定义选项
}
```

#### 3. 预提交钩子失败

**问题**: Git提交时质量检查失败

**解决方案**:
```bash
# 逐步排查问题
npm run format:check        # 检查格式化
npm run lint               # 检查语法
npm run type-check         # 检查类型
npm run test:run           # 检查测试

# 批量修复
npm run quality:fix        # 自动修复可修复问题
```

#### 4. 测试环境问题

**问题**: Vitest测试环境配置错误

**解决方案**:
```bash
# 检查测试设置
npm run test -- --reporter=verbose

# 更新测试设置文件
# src/test/setup.ts
```

## 📈 质量提升建议

### 1. 编辑器集成

**推荐VS Code插件**:
- ESLint
- Prettier - Code formatter
- TypeScript Hero
- Vitest

**设置自动格式化**:
```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

### 2. 团队协作

**代码审查清单**:
- [ ] 所有质量检查通过
- [ ] 测试覆盖关键功能
- [ ] 无console.log等调试代码
- [ ] 类型定义完整
- [ ] 代码格式统一

### 3. 持续改进

**定期评估**:
- 每月评估ESLint规则有效性
- 监控代码质量指标趋势
- 收集团队反馈优化流程

---

## 📞 支持与反馈

如果在使用质量保证体系过程中遇到问题，请：

1. 查阅本文档的故障排除部分
2. 检查相关配置文件
3. 运行单独的质量检查脚本定位问题
4. 向团队报告持续性问题

**质量保证体系版本**: v1.0  
**最后更新**: 2024年12月  
**维护者**: Claude Code Assistant

---

*此文档是项目质量保证体系的完整指南，建议所有开发者仔细阅读并遵循。*