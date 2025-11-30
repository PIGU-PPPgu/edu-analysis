/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [
      './src/test/setup-env.ts',  // 首先加载环境变量
      './src/test/setup.ts'        // 然后加载测试设置
    ],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
        '**/dist/**',
        '**/build/**'
      ],
      // 覆盖率阈值 (Week 1: 60% 目标)
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 55,
        statements: 60
      }
    },
    include: [
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
    ],
    exclude: [
      'node_modules/',
      'dist/',
      '.idea/',
      '.git/',
      '.cache/'
    ],
    // 测试超时设置
    testTimeout: 10000,
    hookTimeout: 10000,
    // 并行运行测试
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
    // 确保测试文件按顺序执行，避免数据库污染
    fileParallelism: false,
    // 报告器配置
    reporter: ['default', 'html'],
    outputFile: {
      html: './coverage/test-report.html'
    }
  },
})