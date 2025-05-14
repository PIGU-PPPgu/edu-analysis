/**
 * 优化工具函数
 * 包含节流、防抖等性能优化函数
 */

/**
 * 节流函数
 * 限制函数在一定时间内只能执行一次
 * 
 * @param fn 要执行的函数 
 * @param delay 延迟时间（毫秒）
 * @returns 节流后的函数
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  let lastCallTime = 0;
  
  return function(this: any, ...args: Parameters<T>): void {
    const now = Date.now();
    
    if (now - lastCallTime >= delay) {
      fn.apply(this, args);
      lastCallTime = now;
    }
  };
}

/**
 * 防抖函数
 * 延迟函数执行，如果在延迟时间内再次调用，则重新计时
 * 
 * @param fn 要执行的函数
 * @param delay 延迟时间（毫秒）
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  let timer: number | null = null;
  
  return function(this: any, ...args: Parameters<T>): void {
    if (timer) {
      clearTimeout(timer);
    }
    
    timer = window.setTimeout(() => {
      fn.apply(this, args);
      timer = null;
    }, delay);
  };
}

/**
 * 延迟执行函数
 * 在指定延迟后执行函数，用于分散计算压力
 * 
 * @param fn 要执行的函数
 * @param delay 延迟时间（毫秒）
 * @returns Promise，完成后返回函数结果
 */
export function delayedExecution<T extends (...args: any[]) => any>(
  fn: T,
  delay: number = 0
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  return function(this: any, ...args: Parameters<T>): Promise<ReturnType<T>> {
    return new Promise(resolve => {
      setTimeout(() => {
        const result = fn.apply(this, args);
        resolve(result);
      }, delay);
    });
  };
}

/**
 * 批量处理函数
 * 将大量数据分批处理，避免阻塞主线程
 * 
 * @param items 要处理的数据数组
 * @param batchProcessor 批处理函数
 * @param batchSize 每批大小
 * @param delayBetweenBatches 批次间延迟（毫秒）
 * @returns Promise，完成后返回处理结果
 */
export async function processBatches<T, R>(
  items: T[],
  batchProcessor: (batch: T[]) => Promise<R[]>,
  batchSize: number = 100,
  delayBetweenBatches: number = 10
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    // 防止UI冻结，每处理一批后让出主线程
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
    
    const batch = items.slice(i, i + batchSize);
    const batchResults = await batchProcessor(batch);
    results.push(...batchResults);
  }
  
  return results;
} 