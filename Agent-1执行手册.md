# 🤖 Agent-1: 项目结构重构专家 - 执行手册

> **执行者**: Agent-1  
> **总耗时**: 5小时  
> **执行原则**: 只能移动/删除/组织文件，严禁修改组件代码内容  

## 🎯 **职责边界**

### ✅ **允许操作**
- 移动、删除、重命名文件和目录
- 创建新的目录结构
- 修改配置文件（package.json, .eslintrc等）
- 创建接口定义文件

### ❌ **禁止操作**
- 修改任何 React 组件内容
- 修改业务逻辑代码
- 修改数据库相关代码
- 修改 API 接口代码

---

## 📋 **阶段1: 根目录清理（2小时）**

### **Step 1: 创建标准目录结构（15分钟）**

```bash
# 创建目录结构
mkdir -p tools/{scripts,database,testing,documentation}
mkdir -p temp/{archives,backup}
mkdir -p docs/{api,user-guide,development}

# 验证目录创建
ls -la tools/
ls -la temp/
ls -la docs/
```

### **Step 2: 分类移动文件（45分钟）**

#### 数据库相关文件移动
```bash
# 移动所有 SQL 文件
mv *.sql tools/database/ 2>/dev/null || true
mv database-*.* tools/database/ 2>/dev/null || true

# 检查移动结果
ls tools/database/
```

#### 测试和调试脚本移动
```bash
# 移动测试文件
mv test-*.* tools/testing/ 2>/dev/null || true
mv debug-*.* tools/testing/ 2>/dev/null || true
mv fix-*.* tools/testing/ 2>/dev/null || true
mv check-*.* tools/testing/ 2>/dev/null || true
mv analyze-*.* tools/testing/ 2>/dev/null || true
mv apply-*.* tools/testing/ 2>/dev/null || true
mv verify-*.* tools/testing/ 2>/dev/null || true

# 检查移动结果
ls tools/testing/
```

#### 文档文件移动
```bash
# 移动 Markdown 文档
mv *.md docs/documentation/ 2>/dev/null || true

# 保留根目录必要的文档
cp docs/documentation/README.md ./
cp docs/documentation/LICENSE.md ./LICENSE 2>/dev/null || true

# 检查移动结果
ls docs/documentation/
```

#### 临时文件归档
```bash
# 移动 CSV 数据文件
mv *.csv temp/archives/ 2>/dev/null || true

# 移动日志文件
mv *.log temp/archives/ 2>/dev/null || true
mv *.tmp temp/archives/ 2>/dev/null || true

# 检查移动结果
ls temp/archives/
```

### **Step 3: 删除垃圾文件（20分钟）**

```bash
# 删除临时文件
rm -f pid.txt env.tmp server.log
rm -f *.tsbuildinfo
rm -f llms-full.txt
rm -f offline-integration-test-report.json
rm -f "package-lock 2.json"

# 清理备份文件
find . -name "*.bak" -delete
find . -name "*.orig" -delete
find . -name "*~" -delete

# 验证清理结果
ls -la | wc -l  # 应该少于30行
```

### **Step 4: 验收检查（10分钟）**

```bash
# 检查根目录文件数量
echo "根目录文件数量："
ls -1 | wc -l

# 应该显示结果 < 30

# 检查关键目录存在
echo "检查目录结构："
ls -la tools/
ls -la temp/
ls -la docs/
ls -la src/

# 检查重要文件没有丢失
echo "检查重要文件："
ls package.json
ls tsconfig.json
ls src/App.tsx
ls README.md
```

---

## 📋 **阶段2: 代码规范建立（3小时）**

### **Step 1: 创建统一接口定义（60分钟）**

#### 创建 `src/types/standards.ts`
```typescript
/**
 * 统一标准接口定义
 * ⚠️ 警告：此文件定义的接口为系统核心接口，任何Agent都不得修改
 * 修改前必须通过所有Agent协商一致
 */

// 统一错误处理接口
export interface StandardError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// 统一组件Props接口
export interface BaseComponentProps {
  isLoading?: boolean;
  error?: StandardError | null;
  onError?: (error: StandardError) => void;
  className?: string;
}

// 统一API响应接口
export interface APIResponse<T> {
  data: T | null;
  error: StandardError | null;
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
    hasMore?: boolean;
  };
}

// 统一加载状态接口
export interface LoadingState {
  isLoading: boolean;
  loadingMessage?: string;
  progress?: number;
}

// 统一验证结果接口
export interface ValidationResult {
  isValid: boolean;
  errors: StandardError[];
  warnings: StandardError[];
}

// 统一分页接口
export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// 统一筛选接口
export interface FilterParams {
  [key: string]: any;
}

// 导出所有标准接口的索引
export const STANDARD_INTERFACES = {
  StandardError: 'StandardError',
  BaseComponentProps: 'BaseComponentProps',
  APIResponse: 'APIResponse<T>',
  LoadingState: 'LoadingState',
  ValidationResult: 'ValidationResult',
  PaginationParams: 'PaginationParams',
  FilterParams: 'FilterParams'
} as const;
```

### **Step 2: 优化 ESLint 配置（30分钟）**

#### 更新 `eslint.config.js`
```javascript
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'tools/**/*', 'temp/**/*'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // 强化规则
      'no-console': 'error',  // 禁止 console.log
      'no-debugger': 'error', // 禁止 debugger
      'no-unused-vars': 'error', // 禁止未使用变量
      '@typescript-eslint/no-explicit-any': 'warn', // 警告 any 类型
      '@typescript-eslint/no-unused-vars': 'error', // 禁止未使用 TS 变量
      'prefer-const': 'error', // 优先使用 const
      'no-var': 'error', // 禁止使用 var
    },
  },
)
```

### **Step 3: 配置 Prettier（15分钟）**

#### 创建 `.prettierrc`
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "endOfLine": "lf",
  "arrowParens": "avoid",
  "bracketSpacing": true,
  "bracketSameLine": false
}
```

#### 创建 `.prettierignore`
```
dist/
node_modules/
tools/
temp/
*.min.js
*.min.css
```

### **Step 4: 优化 TypeScript 配置（15分钟）**

#### 更新 `tsconfig.json`
```json
{
  "extends": "./tsconfig.app.json",
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  },
  "include": [
    "src/**/*",
    "tools/scripts/**/*"
  ],
  "exclude": [
    "tools/testing/**/*",
    "tools/database/**/*",
    "temp/**/*"
  ]
}
```

### **Step 5: 清理 package.json 依赖（20分钟）**

#### 检查并移除未使用的依赖
```bash
# 安装依赖分析工具（如果没有）
npm install -g depcheck

# 分析未使用的依赖
depcheck

# 手动检查 package.json，移除明显不需要的依赖
# 注意：只移除明确确认不需要的依赖，不确定的保留
```

#### 添加有用的脚本
更新 `package.json` 的 scripts 部分：
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint src --ext .ts,.tsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "preview": "vite preview",
    "type-check": "tsc --noEmit",
    "format": "prettier --write src/**/*.{ts,tsx}",
    "format:check": "prettier --check src/**/*.{ts,tsx}",
    "clean": "rm -rf dist node_modules/.vite",
    "analyze": "npm run build && npx vite-bundle-analyzer"
  }
}
```

---

## 🔍 **验收标准检查**

### **最终验收清单**

```bash
# 1. 检查根目录文件数量
echo "=== 根目录文件数量检查 ==="
ls -1 | wc -l
echo "✅ 应该 < 30"

# 2. 检查目录结构
echo "=== 目录结构检查 ==="
ls -la tools/ temp/ docs/
echo "✅ 所有标准目录存在"

# 3. 检查关键文件存在
echo "=== 关键文件检查 ==="
ls package.json tsconfig.json src/App.tsx README.md
ls src/types/standards.ts
echo "✅ 所有关键文件存在"

# 4. 检查 TypeScript 编译
echo "=== TypeScript 编译检查 ==="
npm run type-check
echo "✅ TypeScript 编译无错误"

# 5. 检查 ESLint 配置
echo "=== ESLint 配置检查 ==="
npx eslint src/types/standards.ts
echo "✅ ESLint 配置正常"

# 6. 检查 Prettier 配置
echo "=== Prettier 配置检查 ==="
npx prettier --check src/types/standards.ts
echo "✅ Prettier 配置正常"
```

---

## 📤 **Agent-1 完成交付物**

### **1. 清理后的项目结构**
```
figma-frame-faithful-front/
├── docs/               # 📚 文档
├── src/               # 💻 源代码
├── tools/             # 🔧 开发工具
├── temp/              # 📦 临时文件
├── public/            # 🌐 静态资源
├── package.json       # 📋 项目配置
├── tsconfig.json      # ⚙️ TS配置
├── eslint.config.js   # 🔍 代码检查
├── .prettierrc        # 🎨 代码格式
└── README.md          # 📖 项目说明
```

### **2. 标准接口定义**
- `src/types/standards.ts` - 统一的接口定义
- 所有其他Agent必须遵循这些接口

### **3. 优化后的配置文件**
- ESLint: 严格的代码质量检查
- Prettier: 统一的代码格式
- TypeScript: 增强的类型检查
- Package.json: 清理和优化的依赖

---

## 🔄 **与其他Agent的接口约定**

### **Agent-2 需要的输入**
- ✅ `src/types/standards.ts` 文件存在
- ✅ 可以修改 `types/`, `integrations/`, `lib/` 目录

### **Agent-3 需要的输入** 
- ✅ `StandardError`, `BaseComponentProps` 接口已定义
- ✅ 可以修改 `components/ui/`, `components/shared/` 目录

### **Agent-4 需要的输入**
- ✅ 所有标准接口已定义
- ✅ 可以修改 `components/analysis/` 目录

### **Agent-5 需要的输入**
- ✅ 项目结构清晰，便于添加监控代码
- ✅ 配置文件优化完成

---

**🎉 Agent-1 执行完成后，请确认所有验收标准通过，然后通知可以开始 Agent-2 和其他Agent的工作！** 