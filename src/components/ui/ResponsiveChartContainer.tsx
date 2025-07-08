/**
 * 响应式图表容器组件
 * 解决固定高度图表在不同屏幕尺寸下的显示问题
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveChartContainerProps {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  aspectRatio?: 'square' | 'video' | 'wide' | 'tall';
}

const ResponsiveChartContainer: React.FC<ResponsiveChartContainerProps> = ({
  children,
  className,
  size = 'md',
  aspectRatio = 'video'
}) => {
  // 根据尺寸定义响应式高度
  const sizeClasses = {
    sm: 'h-32 sm:h-40 lg:h-48',
    md: 'h-40 sm:h-48 lg:h-56 xl:h-64',
    lg: 'h-48 sm:h-56 lg:h-64 xl:h-72',
    xl: 'h-56 sm:h-64 lg:h-72 xl:h-80'
  };

  // 根据宽高比定义额外样式
  const aspectRatioClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    wide: 'aspect-[16/6]',
    tall: 'aspect-[4/5]'
  };

  return (
    <div className={cn(
      'w-full relative flex items-center justify-center',
      sizeClasses[size],
      className
    )}>
      <div className="w-full h-full">
        {children}
      </div>
    </div>
  );
};

export default ResponsiveChartContainer;