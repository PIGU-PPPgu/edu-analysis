/**
 * 📱 移动端优化按钮组件
 * 提供符合移动端触摸规范的按钮交互体验
 */

import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Button, ButtonProps } from '@/components/ui/button';
import { useSimpleTouch, useIsTouchDevice } from '@/hooks/use-touch';
import { useViewport } from '@/hooks/use-viewport';
import { Loader2 } from 'lucide-react';

// 移动端按钮变体
export type MobileButtonVariant = 
  | 'primary' 
  | 'secondary' 
  | 'ghost' 
  | 'outline'
  | 'destructive'
  | 'floating'    // 悬浮按钮
  | 'fab'         // 圆形悬浮按钮
  | 'pill';       // 胶囊形按钮

// 移动端按钮尺寸
export type MobileButtonSize = 
  | 'xs'     // 32px 最小触摸尺寸
  | 'sm'     // 36px 
  | 'default'// 44px 推荐触摸尺寸
  | 'lg'     // 52px
  | 'xl'     // 60px
  | 'icon';  // 44x44 图标按钮

// 移动端按钮专用属性
export interface MobileButtonProps extends Omit<ButtonProps, 'variant' | 'size'> {
  variant?: MobileButtonVariant;
  size?: MobileButtonSize;
  isLoading?: boolean;
  loadingText?: string;
  hapticFeedback?: boolean;    // 是否启用触觉反馈
  preventDoubleClick?: boolean; // 防止重复点击
  debounceMs?: number;         // 防抖延迟
  fullWidth?: boolean;         // 全宽度
  elevation?: number;          // 阴影层级 (0-4)
  onLongPress?: () => void;    // 长按回调
  iconLeft?: React.ReactNode;  // 左侧图标
  iconRight?: React.ReactNode; // 右侧图标
  badge?: string | number;     // 角标
}

// 尺寸配置
const SIZE_CONFIG = {
  xs: {
    height: 'h-8',          // 32px
    padding: 'px-3',
    text: 'text-xs',
    minWidth: 'min-w-[64px]'
  },
  sm: {
    height: 'h-9',          // 36px
    padding: 'px-3',
    text: 'text-sm',
    minWidth: 'min-w-[72px]'
  },
  default: {
    height: 'h-11',         // 44px - 推荐触摸尺寸
    padding: 'px-4',
    text: 'text-base',
    minWidth: 'min-w-[88px]'
  },
  lg: {
    height: 'h-13',         // 52px
    padding: 'px-6',
    text: 'text-lg',
    minWidth: 'min-w-[104px]'
  },
  xl: {
    height: 'h-15',         // 60px
    padding: 'px-8',
    text: 'text-xl',
    minWidth: 'min-w-[120px]'
  },
  icon: {
    height: 'h-11 w-11',    // 44x44 正方形
    padding: 'p-0',
    text: 'text-base',
    minWidth: ''
  }
};

// 变体配置
const VARIANT_CONFIG = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-md',
  secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300',
  ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 active:bg-gray-200',
  outline: 'border-2 border-gray-300 text-gray-700 hover:bg-gray-50 active:bg-gray-100',
  destructive: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-md',
  floating: 'bg-white text-gray-900 shadow-lg hover:shadow-xl border border-gray-200',
  fab: 'bg-blue-600 text-white rounded-full shadow-lg hover:shadow-xl hover:bg-blue-700',
  pill: 'bg-gray-800 text-white rounded-full hover:bg-gray-900 active:bg-gray-700'
};

// 阴影配置
const ELEVATION_CONFIG = {
  0: '',
  1: 'shadow-sm',
  2: 'shadow-md',
  3: 'shadow-lg',
  4: 'shadow-xl'
};

export const MobileButton = forwardRef<HTMLButtonElement, MobileButtonProps>(
  ({
    className,
    variant = 'primary',
    size = 'default',
    isLoading = false,
    loadingText,
    hapticFeedback = true,
    preventDoubleClick = true,
    debounceMs = 300,
    fullWidth = false,
    elevation = 1,
    onLongPress,
    iconLeft,
    iconRight,
    badge,
    children,
    onClick,
    disabled,
    ...props
  }, ref) => {
    const isTouchDevice = useIsTouchDevice();
    const { isMobile } = useViewport();
    
    // 防重复点击状态
    const [isClickDisabled, setIsClickDisabled] = React.useState(false);
    
    // 触摸处理
    const { touchHandlers, isPressed } = useSimpleTouch(
      undefined, // tap 处理在 onClick 中
      onLongPress
    );

    // 触觉反馈
    const triggerHapticFeedback = React.useCallback(() => {
      if (hapticFeedback && 'vibrate' in navigator && isTouchDevice) {
        navigator.vibrate(10); // 轻微震动 10ms
      }
    }, [hapticFeedback, isTouchDevice]);

    // 点击处理
    const handleClick = React.useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
      if (isLoading || disabled || isClickDisabled) {
        e.preventDefault();
        return;
      }

      // 触觉反馈
      triggerHapticFeedback();

      // 防重复点击
      if (preventDoubleClick) {
        setIsClickDisabled(true);
        setTimeout(() => setIsClickDisabled(false), debounceMs);
      }

      onClick?.(e);
    }, [isLoading, disabled, isClickDisabled, onClick, triggerHapticFeedback, preventDoubleClick, debounceMs]);

    // 计算按钮类名
    const sizeConfig = SIZE_CONFIG[size];
    const variantConfig = VARIANT_CONFIG[variant];
    const elevationConfig = ELEVATION_CONFIG[elevation];

    // 渲染加载指示器
    const renderLoadingIndicator = () => {
      if (!isLoading) return null;
      
      return (
        <div className="flex items-center">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          {loadingText && <span>{loadingText}</span>}
        </div>
      );
    };

    // 渲染按钮内容
    const renderContent = () => {
      if (isLoading && loadingText) {
        return renderLoadingIndicator();
      }

      return (
        <>
          {iconLeft && (
            <span className={cn("flex items-center", children && "mr-2")}>
              {iconLeft}
            </span>
          )}
          
          {isLoading && !loadingText ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            children
          )}
          
          {iconRight && (
            <span className={cn("flex items-center", children && "ml-2")}>
              {iconRight}
            </span>
          )}
        </>
      );
    };

    // 渲染角标
    const renderBadge = () => {
      if (!badge) return null;
      
      return (
        <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-xs rounded-full flex items-center justify-center px-1">
          {badge}
        </div>
      );
    };

    const finalClassName = cn(
      // 基础样式
      'relative inline-flex items-center justify-center font-medium transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      
      // 尺寸配置
      sizeConfig.height,
      sizeConfig.padding,
      sizeConfig.text,
      !fullWidth && sizeConfig.minWidth,
      
      // 全宽度
      fullWidth && 'w-full',
      
      // 变体样式
      variantConfig,
      
      // 阴影
      elevationConfig,
      
      // 触摸状态
      isTouchDevice && isPressed && 'scale-[0.98] transform',
      
      // 圆角处理
      variant === 'fab' ? 'rounded-full' :
      variant === 'pill' ? 'rounded-full' :
      'rounded-lg',
      
      // 移动端优化
      isMobile && [
        'select-none', // 防止选中文本
        'touch-manipulation', // 优化触摸延迟
        '-webkit-tap-highlight-color: transparent' // 移除点击高亮
      ],
      
      className
    );

    const buttonProps = {
      ref,
      className: finalClassName,
      onClick: handleClick,
      disabled: disabled || isLoading || isClickDisabled,
      ...(isTouchDevice && touchHandlers),
      ...props
    };

    return (
      <button {...buttonProps}>
        {renderContent()}
        {renderBadge()}
      </button>
    );
  }
);

MobileButton.displayName = 'MobileButton';

// 预设的按钮组合
export const MobilePrimaryButton = forwardRef<HTMLButtonElement, Omit<MobileButtonProps, 'variant'>>(
  (props, ref) => <MobileButton ref={ref} variant="primary" {...props} />
);

export const MobileSecondaryButton = forwardRef<HTMLButtonElement, Omit<MobileButtonProps, 'variant'>>(
  (props, ref) => <MobileButton ref={ref} variant="secondary" {...props} />
);

export const MobileFloatingActionButton = forwardRef<HTMLButtonElement, Omit<MobileButtonProps, 'variant' | 'size'>>(
  (props, ref) => <MobileButton ref={ref} variant="fab" size="icon" elevation={3} {...props} />
);

export const MobileIconButton = forwardRef<HTMLButtonElement, Omit<MobileButtonProps, 'size'>>(
  (props, ref) => <MobileButton ref={ref} size="icon" {...props} />
);

// 常用按钮组合
export const MobileButtonGroup: React.FC<{
  children: React.ReactNode;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}> = ({ 
  children, 
  orientation = 'horizontal',
  className 
}) => {
  return (
    <div className={cn(
      'flex',
      orientation === 'horizontal' ? 'flex-row space-x-2' : 'flex-col space-y-2',
      className
    )}>
      {children}
    </div>
  );
};