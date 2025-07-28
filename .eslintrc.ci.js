// ESLint配置 - CI专用（更宽松的规则）
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { 
    ignores: [
      'dist', 
      'backup/**/*', 
      'supabase/functions/**/*', 
      'scripts/**/*',
      '*.config.ts',
      '*.config.js',
      'ImportProcessor-fix-patch.tsx'
    ] 
  },
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
      // CI环境下更宽松的规则
      '@typescript-eslint/no-unused-vars': 'off',  // 允许未使用变量
      '@typescript-eslint/no-explicit-any': 'off', // 允许any类型
      'react-hooks/exhaustive-deps': 'warn',       // Hook依赖警告而非错误
      'no-prototype-builtins': 'warn',             // 原型方法警告
      '@typescript-eslint/no-non-null-assertion': 'off', // 允许非空断言
      // 只检查真正重要的错误
      'no-unused-expressions': 'error',
      'no-unreachable': 'error',
      'no-undef': 'error',
    },
  },
)