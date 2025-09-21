/**
 * 虚拟列表组件
 * 用于高性能渲染大量数据项
 */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  overscan?: number; // 预渲染的额外项目数量
  onScroll?: (scrollTop: number) => void;
  searchTerm?: string;
  searchFields?: (keyof T)[];
}

export function VirtualList<T extends Record<string, any>>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  className = '',
  overscan = 5,
  onScroll,
  searchTerm = '',
  searchFields = [],
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  // 过滤数据
  const filteredItems = useMemo(() => {
    if (!searchTerm || searchFields.length === 0) return items;

    return items.filter(item =>
      searchFields.some(field => {
        const value = item[field];
        if (typeof value === 'string') {
          return value.toLowerCase().includes(searchTerm.toLowerCase());
        }
        if (typeof value === 'number') {
          return value.toString().includes(searchTerm);
        }
        return false;
      })
    );
  }, [items, searchTerm, searchFields]);

  // 计算可见范围
  const visibleRange = useMemo(() => {
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + visibleCount + overscan,
      filteredItems.length
    );

    return {
      startIndex: Math.max(0, startIndex - overscan),
      endIndex,
      visibleCount,
    };
  }, [scrollTop, containerHeight, itemHeight, overscan, filteredItems.length]);

  // 可见项目
  const visibleItems = useMemo(() => {
    return filteredItems.slice(visibleRange.startIndex, visibleRange.endIndex);
  }, [filteredItems, visibleRange.startIndex, visibleRange.endIndex]);

  // 处理滚动事件
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    onScroll?.(newScrollTop);
  }, [onScroll]);

  // 滚动到指定项目
  const scrollToItem = useCallback((index: number) => {
    if (scrollElementRef.current) {
      const targetScrollTop = index * itemHeight;
      scrollElementRef.current.scrollTop = targetScrollTop;
      setScrollTop(targetScrollTop);
    }
  }, [itemHeight]);

  // 滚动到顶部
  const scrollToTop = useCallback(() => {
    scrollToItem(0);
  }, [scrollToItem]);

  // 总高度
  const totalHeight = filteredItems.length * itemHeight;

  // 上方偏移量
  const offsetY = visibleRange.startIndex * itemHeight;

  return (
    <div className={`relative ${className}`}>
      {/* 虚拟滚动容器 */}
      <div
        ref={scrollElementRef}
        className="overflow-auto"
        style={{ height: containerHeight }}
        onScroll={handleScroll}
      >
        {/* 总高度占位 */}
        <div style={{ height: totalHeight, position: 'relative' }}>
          {/* 可见项目容器 */}
          <div
            style={{
              transform: `translateY(${offsetY}px)`,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
            }}
          >
            {visibleItems.map((item, index) => (
              <div
                key={visibleRange.startIndex + index}
                style={{ height: itemHeight }}
                className="flex items-center"
              >
                {renderItem(item, visibleRange.startIndex + index)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 性能统计（开发模式） */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white text-xs p-2 rounded">
          <div>总项目: {filteredItems.length}</div>
          <div>可见项目: {visibleItems.length}</div>
          <div>渲染范围: {visibleRange.startIndex}-{visibleRange.endIndex}</div>
          <div>滚动位置: {Math.round(scrollTop)}px</div>
        </div>
      )}

      {/* 快速导航（可选） */}
      {filteredItems.length > 100 && (
        <div className="absolute bottom-2 right-2 flex gap-2">
          <button
            onClick={scrollToTop}
            className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
          >
            回到顶部
          </button>
        </div>
      )}
    </div>
  );
}

// 导出工具函数
export const VirtualListUtils = {
  // 计算最佳项目高度
  calculateOptimalItemHeight: (containerHeight: number, maxItems: number = 50) => {
    return Math.max(40, Math.floor(containerHeight / maxItems));
  },

  // 计算最佳容器高度
  calculateOptimalContainerHeight: (itemHeight: number, visibleItems: number = 10) => {
    return itemHeight * visibleItems;
  },

  // 预估性能收益
  estimatePerformanceBenefit: (totalItems: number, visibleItems: number = 20) => {
    const renderRatio = visibleItems / totalItems;
    const memoryReduction = (1 - renderRatio) * 100;
    const performanceImprovement = totalItems / visibleItems;

    return {
      renderRatio: Math.round(renderRatio * 100) / 100,
      memoryReduction: Math.round(memoryReduction),
      performanceImprovement: Math.round(performanceImprovement * 10) / 10,
    };
  },
};