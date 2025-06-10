// 页面性能检测脚本
const performanceData = {
  timing: performance.timing,
  navigation: performance.navigation,
  memory: performance.memory || {},
  loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
  domReady: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
  firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 0,
  currentMemoryUsage: performance.memory ? performance.memory.usedJSHeapSize / 1024 / 1024 : 0
};

console.log('=== 性能测试结果 ===');
console.log(`页面加载时间: ${performanceData.loadTime}ms`);
console.log(`DOM就绪时间: ${performanceData.domReady}ms`);
console.log(`首次绘制时间: ${performanceData.firstPaint}ms`);
console.log(`当前内存使用: ${performanceData.currentMemoryUsage.toFixed(2)}MB`);
console.log('详细性能数据:', JSON.stringify(performanceData, null, 2));

// 返回关键指标
return {
  loadTime: performanceData.loadTime,
  domReady: performanceData.domReady,
  firstPaint: performanceData.firstPaint,
  memory: performanceData.currentMemoryUsage
}; 