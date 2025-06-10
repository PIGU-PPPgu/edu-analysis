# ⚡ Agent-5: 性能监控与优化专家 - 执行手册

> **执行者**: Agent-5  
> **总耗时**: 4小时  
> **执行原则**: 添加监控代码，优化性能，不破坏现有功能  

## 🎯 **职责边界**

### ✅ **允许操作**
- 添加性能监控代码
- 优化打包配置
- 添加错误监控和上报
- 创建性能分析工具
- 优化资源加载

### ❌ **禁止操作**
- 修改业务逻辑
- 破坏现有功能
- 修改核心接口定义

---

## 📋 **阶段1: 性能监控基础设施（1.5小时）**

### **Step 1: 性能监控Hook（30分钟）**

#### 创建 `src/hooks/usePerformanceMonitor.ts`
```typescript
import { useEffect, useRef } from 'react';

interface PerformanceMetrics {
  componentName: string;
  renderTime: number;
  mountTime: number;
  updateCount: number;
  errorCount: number;
}

export function usePerformanceMonitor(componentName: string) {
  const renderStartTime = useRef<number>(0);
  const mountTime = useRef<number>(0);
  const updateCount = useRef<number>(0);
  const errorCount = useRef<number>(0);

  useEffect(() => {
    mountTime.current = performance.now();
    
    return () => {
      const metrics: PerformanceMetrics = {
        componentName,
        renderTime: performance.now() - renderStartTime.current,
        mountTime: mountTime.current,
        updateCount: updateCount.current,
        errorCount: errorCount.current
      };
      
      // 发送性能数据
      reportPerformanceMetrics(metrics);
    };
  }, [componentName]);

  useEffect(() => {
    updateCount.current += 1;
  });

  const startRender = () => {
    renderStartTime.current = performance.now();
  };

  const reportError = () => {
    errorCount.current += 1;
  };

  return { startRender, reportError };
}

function reportPerformanceMetrics(metrics: PerformanceMetrics) {
  // 开发环境输出到控制台
  if (process.env.NODE_ENV === 'development') {
    console.group(`Performance Metrics: ${metrics.componentName}`);
    console.log('Render Time:', `${metrics.renderTime.toFixed(2)}ms`);
    console.log('Mount Time:', `${metrics.mountTime.toFixed(2)}ms`);
    console.log('Update Count:', metrics.updateCount);
    console.log('Error Count:', metrics.errorCount);
    console.groupEnd();
  }

  // 生产环境可以发送到监控服务
  if (process.env.NODE_ENV === 'production') {
    // analytics.track('component_performance', metrics);
  }
}
```

### **Step 2: 错误监控系统（45分钟）**

#### 创建 `src/lib/monitoring/errorTracking.ts`
```typescript
import type { StandardError } from '@/types/standards';

interface ErrorContext {
  userId?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
}

class ErrorTracker {
  private static instance: ErrorTracker;
  private errors: StandardError[] = [];
  private maxErrors = 100;

  static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker();
    }
    return ErrorTracker.instance;
  }

  captureError(error: StandardError, context?: ErrorContext) {
    const enhancedError = {
      ...error,
      context,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString()
    };

    this.errors.push(enhancedError);
    
    // 保持错误日志在限制范围内
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    // 发送到监控服务
    this.reportError(enhancedError);
    
    // 严重错误立即处理
    if (error.severity === 'critical') {
      this.handleCriticalError(enhancedError);
    }
  }

  private reportError(error: any) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Captured:', error);
    } else {
      // 生产环境发送到错误监控服务
      // Sentry.captureException(error);
    }
  }

  private handleCriticalError(error: any) {
    // 严重错误处理逻辑
    console.error('Critical Error:', error);
    
    // 可能需要刷新页面或显示错误页面
    if (error.code === 'MEMORY_LEAK' || error.code === 'INFINITE_LOOP') {
      window.location.reload();
    }
  }

  getErrors(): StandardError[] {
    return [...this.errors];
  }

  clearErrors() {
    this.errors = [];
  }
}

export const errorTracker = ErrorTracker.getInstance();

// 全局错误捕获
window.addEventListener('error', (event) => {
  errorTracker.captureError({
    code: 'JAVASCRIPT_ERROR',
    message: event.message,
    details: {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack
    },
    timestamp: new Date().toISOString(),
    severity: 'high'
  });
});

window.addEventListener('unhandledrejection', (event) => {
  errorTracker.captureError({
    code: 'UNHANDLED_PROMISE_REJECTION',
    message: 'Unhandled Promise Rejection',
    details: {
      reason: event.reason,
      promise: event.promise
    },
    timestamp: new Date().toISOString(),
    severity: 'high'
  });
});
```

### **Step 3: 资源监控（15分钟）**

#### 创建 `src/lib/monitoring/resourceMonitor.ts`
```typescript
class ResourceMonitor {
  private static instance: ResourceMonitor;

  static getInstance(): ResourceMonitor {
    if (!ResourceMonitor.instance) {
      ResourceMonitor.instance = new ResourceMonitor();
    }
    return ResourceMonitor.instance;
  }

  startMonitoring() {
    // 内存使用监控
    this.monitorMemoryUsage();
    
    // 网络请求监控
    this.monitorNetworkRequests();
    
    // 页面性能监控
    this.monitorPagePerformance();
  }

  private monitorMemoryUsage() {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        const memoryUsage = {
          used: Math.round(memory.usedJSHeapSize / 1048576), // MB
          total: Math.round(memory.totalJSHeapSize / 1048576), // MB
          limit: Math.round(memory.jsHeapSizeLimit / 1048576) // MB
        };

        if (memoryUsage.used > memoryUsage.limit * 0.9) {
          console.warn('High memory usage detected:', memoryUsage);
        }
      }, 30000); // 每30秒检查一次
    }
  }

  private monitorNetworkRequests() {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const start = performance.now();
      try {
        const response = await originalFetch(...args);
        const duration = performance.now() - start;
        
        console.log(`Fetch: ${args[0]} - ${duration.toFixed(2)}ms`);
        
        if (duration > 3000) {
          console.warn(`Slow request detected: ${args[0]} - ${duration.toFixed(2)}ms`);
        }
        
        return response;
      } catch (error) {
        const duration = performance.now() - start;
        console.error(`Fetch error: ${args[0]} - ${duration.toFixed(2)}ms`, error);
        throw error;
      }
    };
  }

  private monitorPagePerformance() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            console.log('Page Load Performance:', {
              domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
              loadComplete: entry.loadEventEnd - entry.loadEventStart,
              firstContentfulPaint: entry.responseEnd - entry.fetchStart
            });
          }
        }
      });
      
      observer.observe({ entryTypes: ['navigation'] });
    }
  }
}

export const resourceMonitor = ResourceMonitor.getInstance();
```

---

## 📋 **阶段2: 性能优化（1.5小时）**

### **Step 1: 打包优化（45分钟）**

#### 更新 `vite.config.ts`
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { analyzer } from 'vite-bundle-analyzer';

export default defineConfig({
  plugins: [
    react(),
    // 生产环境启用包分析
    process.env.ANALYZE ? analyzer() : null
  ].filter(Boolean),
  
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  
  build: {
    target: 'esnext',
    minify: 'esbuild',
    
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          charts: ['recharts', '@nivo/core', '@nivo/bar'],
          utils: ['date-fns', 'lodash', 'clsx']
        }
      }
    },
    
    // 启用 gzip 压缩
    cssCodeSplit: true,
    
    // 优化 chunk 大小
    chunkSizeWarningLimit: 1000
  },
  
  // 开发服务器优化
  server: {
    hmr: {
      overlay: false
    }
  },
  
  // 优化依赖预构建
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@supabase/supabase-js',
      'react-query'
    ]
  }
});
```

### **Step 2: 代码分割优化（45分钟）**

#### 创建 `src/lib/lazyComponents.ts`
```typescript
import { lazy } from 'react';
import { LoadingSpinner } from '@/components/shared/LoadingStates';

// 创建带加载状态的懒加载HOC
function createLazyComponent<T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback = <LoadingSpinner size="lg" />
) {
  const LazyComponent = lazy(importFunc);
  
  return (props: React.ComponentProps<T>) => (
    <React.Suspense fallback={fallback}>
      <LazyComponent {...props} />
    </React.Suspense>
  );
}

// 懒加载主要模块
export const LazyGradeAnalysis = createLazyComponent(
  () => import('@/components/analysis/AdvancedDashboard')
);

export const LazyHomeworkManager = createLazyComponent(
  () => import('@/components/homework/HomeworkManager')
);

export const LazyWarningAnalysis = createLazyComponent(
  () => import('@/components/warning/WarningAnalysis')
);

export const LazyStudentPortrait = createLazyComponent(
  () => import('@/components/portrait/StudentPortraitOverview')
);

// 图表组件懒加载
export const LazyBoxPlotChart = createLazyComponent(
  () => import('@/components/analysis/BoxPlotChart')
);

export const LazyHeatmapChart = createLazyComponent(
  () => import('@/components/analysis/HeatmapChart')
);
```

---

## 📋 **阶段3: 监控集成（1小时）**

### **Step 1: 应用监控初始化（30分钟）**

#### 更新 `src/App.tsx`
```typescript
import React, { useEffect } from 'react';
import { errorTracker } from '@/lib/monitoring/errorTracking';
import { resourceMonitor } from '@/lib/monitoring/resourceMonitor';

function App() {
  useEffect(() => {
    // 初始化监控系统
    if (process.env.NODE_ENV === 'production') {
      resourceMonitor.startMonitoring();
    }
    
    // 页面性能监控
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'largest-contentful-paint') {
            console.log('LCP:', entry.startTime);
          }
          if (entry.entryType === 'first-input') {
            console.log('FID:', entry.processingStart - entry.startTime);
          }
        }
      });
      
      observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input'] });
    }
  }, []);

  return (
    // ... 现有的App内容
  );
}
```

### **Step 2: 性能分析工具（30分钟）**

#### 创建 `src/tools/PerformanceDebugger.tsx`
```typescript
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { errorTracker } from '@/lib/monitoring/errorTracking';

export function PerformanceDebugger() {
  const [isVisible, setIsVisible] = useState(false);
  const [performanceData, setPerformanceData] = useState<any>({});
  const [errors, setErrors] = useState<any[]>([]);

  useEffect(() => {
    // 只在开发环境显示
    if (process.env.NODE_ENV === 'development') {
      // 监听键盘快捷键 Ctrl+Shift+P
      const handleKeyPress = (e: KeyboardEvent) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'P') {
          setIsVisible(!isVisible);
        }
      };
      
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }
  }, [isVisible]);

  const refreshData = () => {
    // 获取性能数据
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      setPerformanceData({
        memory: {
          used: Math.round(memory.usedJSHeapSize / 1048576),
          total: Math.round(memory.totalJSHeapSize / 1048576),
          limit: Math.round(memory.jsHeapSizeLimit / 1048576)
        },
        timing: performance.timing,
        navigation: performance.getEntriesByType('navigation')[0]
      });
    }
    
    // 获取错误数据
    setErrors(errorTracker.getErrors());
  };

  if (!isVisible || process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-96 overflow-auto">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">性能调试器</CardTitle>
            <div className="space-x-2">
              <Button size="sm" variant="outline" onClick={refreshData}>
                刷新
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsVisible(false)}>
                ×
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="text-xs space-y-2">
          {performanceData.memory && (
            <div>
              <strong>内存使用:</strong>
              <div>已用: {performanceData.memory.used}MB</div>
              <div>总计: {performanceData.memory.total}MB</div>
              <div>限制: {performanceData.memory.limit}MB</div>
            </div>
          )}
          
          <div>
            <strong>错误数量:</strong> {errors.length}
            {errors.slice(0, 3).map((error, index) => (
              <div key={index} className="text-red-600">
                {error.code}: {error.message}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 🔍 **验收标准**

```bash
# 1. 构建性能检查
echo "=== 构建性能检查 ==="
npm run build
echo "✅ 构建成功"

# 2. 包大小分析
echo "=== 包大小分析 ==="
ANALYZE=true npm run build
echo "✅ 包大小分析完成"

# 3. 运行时性能检查
echo "=== 运行时性能检查 ==="
npm run dev
echo "✅ 开发服务器启动正常"

# 4. 监控系统检查
echo "=== 监控系统检查 ==="
# 检查是否正确初始化了监控
grep -r "errorTracker\|resourceMonitor" src/
echo "✅ 监控系统集成完成"
```

---

## 📤 **Agent-5 完成交付物**

### **1. 完整的性能监控系统**
- 组件性能监控
- 错误捕获和上报
- 资源使用监控
- 网络请求监控

### **2. 构建和运行时优化**
- Vite配置优化
- 代码分割策略
- 懒加载实现
- 资源压缩优化

### **3. 开发调试工具**
- 性能调试器
- 错误日志查看器
- 实时性能监控

### **4. 生产环境支持**
- 错误监控服务集成准备
- 性能指标收集
- 用户体验监控

---

**🎉 Agent-5完成后，整个系统将具备企业级的性能监控能力，为持续优化提供数据支持！** 