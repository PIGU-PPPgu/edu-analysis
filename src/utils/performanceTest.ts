/**
 * 🎯 性能测试工具
 * 用于验证OptimizedGradeDataTable的性能优化效果
 */

export interface PerformanceMetrics {
  renderTime: number;
  componentCount: number;
  memoryUsage?: number;
  averageRenderTime: number;
  maxRenderTime: number;
  minRenderTime: number;
}

export class PerformanceMonitor {
  private renderTimes: number[] = [];
  private renderCount = 0;

  // 开始性能监控
  startRender(): void {
    performance.mark("render-start");
  }

  // 结束性能监控
  endRender(): PerformanceMetrics {
    performance.mark("render-end");
    performance.measure("render-time", "render-start", "render-end");

    const measure = performance.getEntriesByName("render-time")[0];
    const renderTime = measure.duration;

    this.renderTimes.push(renderTime);
    this.renderCount++;

    const metrics: PerformanceMetrics = {
      renderTime,
      componentCount: this.renderCount,
      averageRenderTime:
        this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length,
      maxRenderTime: Math.max(...this.renderTimes),
      minRenderTime: Math.min(...this.renderTimes),
    };

    // 获取内存使用情况（如果浏览器支持）
    if ("memory" in performance) {
      metrics.memoryUsage = (performance as any).memory.usedJSHeapSize;
    }

    // 清理性能标记
    performance.clearMarks();
    performance.clearMeasures();

    return metrics;
  }

  // 重置监控数据
  reset(): void {
    this.renderTimes = [];
    this.renderCount = 0;
  }

  // 获取统计信息
  getStats(): PerformanceMetrics | null {
    if (this.renderTimes.length === 0) return null;

    return {
      renderTime: this.renderTimes[this.renderTimes.length - 1],
      componentCount: this.renderCount,
      averageRenderTime:
        this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length,
      maxRenderTime: Math.max(...this.renderTimes),
      minRenderTime: Math.min(...this.renderTimes),
    };
  }

  // 检查是否存在性能问题
  hasPerformanceIssues(): boolean {
    const stats = this.getStats();
    if (!stats) return false;

    // 如果平均渲染时间超过100ms，认为有性能问题
    return stats.averageRenderTime > 100 || stats.maxRenderTime > 1000;
  }

  // 生成性能报告
  generateReport(): string {
    const stats = this.getStats();
    if (!stats) return "No performance data available";

    const hasIssues = this.hasPerformanceIssues();

    return `
🎯 VirtualRow Performance Report
================================
总渲染次数: ${stats.componentCount}
平均渲染时间: ${stats.averageRenderTime.toFixed(2)}ms
最大渲染时间: ${stats.maxRenderTime.toFixed(2)}ms  
最小渲染时间: ${stats.minRenderTime.toFixed(2)}ms
${stats.memoryUsage ? `内存使用: ${(stats.memoryUsage / 1024 / 1024).toFixed(2)}MB` : ""}

${hasIssues ? "⚠️ 检测到性能问题" : "✅ 性能表现良好"}

优化建议:
${stats.averageRenderTime > 100 ? "- 考虑进一步优化渲染逻辑" : ""}
${stats.maxRenderTime > 1000 ? "- 检查是否存在阻塞操作" : ""}
${hasIssues ? "- 启用React.memo和useCallback优化" : ""}
    `;
  }
}

// 全局性能监控实例
export const performanceMonitor = new PerformanceMonitor();

// 性能测试Hook
export const usePerformanceTest = (componentName: string) => {
  const monitor = new PerformanceMonitor();

  const startTest = () => {
    console.log(`🎯 Starting performance test for ${componentName}`);
    monitor.startRender();
  };

  const endTest = () => {
    const metrics = monitor.endRender();
    console.log(`🎯 Performance test completed for ${componentName}:`, metrics);

    if (metrics.renderTime > 1000) {
      console.warn(
        `⚠️ Slow render detected: ${metrics.renderTime.toFixed(2)}ms`
      );
    }

    return metrics;
  };

  return { startTest, endTest, monitor };
};
