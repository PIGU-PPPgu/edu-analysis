/**
 * 📱 移动端导航组件
 * 提供汉堡菜单、滑动抽屉和触摸友好的导航体验
 */

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useViewport } from '@/hooks/use-viewport';
import { useSwipe, useSimpleTouch } from '@/hooks/use-touch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MobileButton } from './MobileButton';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Menu,
  X,
  Home,
  BarChart3,
  Users,
  Settings,
  Bell,
  Search,
  ChevronRight,
  LogOut,
  User,
  HelpCircle
} from 'lucide-react';

// 导航项接口
export interface NavigationItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  badge?: {
    text: string;
    variant?: 'default' | 'success' | 'warning' | 'error';
  };
  children?: NavigationItem[];
  disabled?: boolean;
  divider?: boolean;  // 是否在此项后显示分割线
}

// 移动端导航属性
export interface MobileNavigationProps {
  // 导航项
  items: NavigationItem[];
  
  // 当前激活项
  activeItemId?: string;
  
  // 品牌信息
  brand?: {
    name: string;
    logo?: React.ReactNode;
    subtitle?: string;
  };
  
  // 用户信息
  user?: {
    name: string;
    avatar?: string;
    email?: string;
    role?: string;
  };
  
  // 顶部操作按钮
  headerActions?: Array<{
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    badge?: string;
  }>;
  
  // 底部操作
  footerActions?: NavigationItem[];
  
  // 配置
  enableSwipeGesture?: boolean;  // 是否启用滑动手势
  autoClose?: boolean;          // 点击项目后是否自动关闭
  overlay?: boolean;            // 是否显示遮罩
  position?: 'left' | 'right';  // 抽屉位置
  
  // 事件回调
  onItemClick?: (item: NavigationItem) => void;
  onOpen?: () => void;
  onClose?: () => void;
  
  // 样式
  className?: string;
  contentClassName?: string;
}

// 预设的导航项图标
const DEFAULT_ICONS = {
  home: <Home className="w-5 h-5" />,
  analytics: <BarChart3 className="w-5 h-5" />,
  users: <Users className="w-5 h-5" />,
  settings: <Settings className="w-5 h-5" />,
  notifications: <Bell className="w-5 h-5" />,
  search: <Search className="w-5 h-5" />,
  help: <HelpCircle className="w-5 h-5" />,
  logout: <LogOut className="w-5 h-5" />
};

// 用户头像组件
const UserAvatar: React.FC<{ user: MobileNavigationProps['user'] }> = ({ user }) => {
  if (!user) return null;
  
  return (
    <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
      <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
        {user.avatar ? (
          <img 
            src={user.avatar} 
            alt={user.name}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <User className="w-6 h-6" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="font-semibold truncate">{user.name}</div>
        {user.email && (
          <div className="text-sm text-blue-100 truncate">{user.email}</div>
        )}
        {user.role && (
          <Badge variant="secondary" className="mt-1 text-xs">
            {user.role}
          </Badge>
        )}
      </div>
    </div>
  );
};

// 导航项组件
const NavigationItemComponent: React.FC<{
  item: NavigationItem;
  isActive: boolean;
  onItemClick: (item: NavigationItem) => void;
  level?: number;
}> = ({ item, isActive, onItemClick, level = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = item.children && item.children.length > 0;
  
  const { touchHandlers, isPressed } = useSimpleTouch(
    () => {
      if (hasChildren) {
        setIsExpanded(!isExpanded);
      } else {
        onItemClick(item);
      }
    }
  );

  const handleClick = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    } else {
      onItemClick(item);
    }
  };

  const itemContent = (
    <div
      className={cn(
        'flex items-center space-x-3 p-3 rounded-lg transition-all duration-200',
        'hover:bg-gray-100 active:bg-gray-200 select-none',
        isPressed && 'bg-gray-200 scale-[0.98]',
        isActive && 'bg-blue-50 text-blue-700 font-medium',
        item.disabled && 'opacity-50 cursor-not-allowed',
        level > 0 && 'ml-4 pl-8 border-l-2 border-gray-200'
      )}
      style={{ paddingLeft: `${12 + level * 16}px` }}
      {...touchHandlers}
      onClick={!item.disabled ? handleClick : undefined}
    >
      {/* 图标 */}
      {item.icon && (
        <div className={cn(
          'flex-shrink-0',
          isActive ? 'text-blue-700' : 'text-gray-600'
        )}>
          {item.icon}
        </div>
      )}
      
      {/* 标签 */}
      <div className="flex-1 min-w-0">
        <span className="truncate">{item.label}</span>
      </div>
      
      {/* 徽章 */}
      {item.badge && (
        <Badge 
          variant={item.badge.variant || 'default'}
          className="text-xs"
        >
          {item.badge.text}
        </Badge>
      )}
      
      {/* 展开箭头 */}
      {hasChildren && (
        <ChevronRight 
          className={cn(
            'w-4 h-4 transition-transform duration-200',
            isExpanded && 'rotate-90'
          )}
        />
      )}
    </div>
  );

  return (
    <div>
      {itemContent}
      
      {/* 子项目 */}
      {hasChildren && isExpanded && (
        <div className="mt-1 space-y-1">
          {item.children!.map((child) => (
            <NavigationItemComponent
              key={child.id}
              item={child}
              isActive={false}  // 子项目暂不支持激活状态
              onItemClick={onItemClick}
              level={level + 1}
            />
          ))}
        </div>
      )}
      
      {/* 分割线 */}
      {item.divider && (
        <div className="my-2 border-t border-gray-200" />
      )}
    </div>
  );
};

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  items,
  activeItemId,
  brand,
  user,
  headerActions = [],
  footerActions = [],
  enableSwipeGesture = true,
  autoClose = true,
  overlay = true,
  position = 'left',
  onItemClick,
  onOpen,
  onClose,
  className,
  contentClassName
}) => {
  const { isMobile } = useViewport();
  const [isOpen, setIsOpen] = useState(false);
  
  // 滑动手势处理
  const { touchHandlers: swipeHandlers } = useSwipe(
    position === 'left' ? () => setIsOpen(false) : undefined,  // 向左滑动关闭（左侧抽屉）
    position === 'right' ? () => setIsOpen(false) : undefined, // 向右滑动关闭（右侧抽屉）
    undefined,
    undefined
  );

  // 处理导航项点击
  const handleItemClick = (item: NavigationItem) => {
    // 执行项目的点击处理
    if (item.onClick) {
      item.onClick();
    }
    
    // 执行外部点击处理
    onItemClick?.(item);
    
    // 自动关闭抽屉
    if (autoClose && !item.children) {
      setIsOpen(false);
    }
  };

  // 打开抽屉
  const handleOpen = () => {
    setIsOpen(true);
    onOpen?.();
  };

  // 关闭抽屉
  const handleClose = () => {
    setIsOpen(false);
    onClose?.();
  };

  // 渲染品牌区域
  const renderBrand = () => {
    if (!brand) return null;
    
    return (
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          {brand.logo && (
            <div className="flex-shrink-0">
              {brand.logo}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-bold text-lg truncate">
              {brand.name}
            </div>
            {brand.subtitle && (
              <div className="text-sm text-gray-600 truncate">
                {brand.subtitle}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // 渲染导航内容
  const renderNavigationContent = () => (
    <div className={cn('flex flex-col h-full', contentClassName)}>
      {/* 用户信息 */}
      <UserAvatar user={user} />
      
      {/* 品牌信息 */}
      {renderBrand()}
      
      {/* 导航项 */}
      <div className="flex-1 overflow-y-auto p-4">
        <nav className="space-y-1">
          {items.map((item) => (
            <NavigationItemComponent
              key={item.id}
              item={item}
              isActive={item.id === activeItemId}
              onItemClick={handleItemClick}
            />
          ))}
        </nav>
      </div>
      
      {/* 底部操作 */}
      {footerActions.length > 0 && (
        <div className="border-t border-gray-200 p-4">
          <div className="space-y-1">
            {footerActions.map((item) => (
              <NavigationItemComponent
                key={item.id}
                item={item}
                isActive={false}
                onItemClick={handleItemClick}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // 如果不是移动端，不渲染移动端导航
  if (!isMobile) {
    return null;
  }

  return (
    <>
      {/* 触发按钮 */}
      <MobileButton
        variant="ghost"
        size="icon"
        onClick={handleOpen}
        className={className}
        aria-label="打开导航菜单"
      >
        <Menu className="w-5 h-5" />
      </MobileButton>

      {/* 抽屉组件 */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent 
          side={position}
          className="w-80 p-0"
          {...(enableSwipeGesture && swipeHandlers)}
        >
          {renderNavigationContent()}
        </SheetContent>
      </Sheet>
    </>
  );
};

// 预设的移动端导航栏组件
export const MobileTopBar: React.FC<{
  title?: string;
  showBackButton?: boolean;
  onBackClick?: () => void;
  actions?: Array<{
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    badge?: string;
  }>;
  navigationProps?: Omit<MobileNavigationProps, 'className'>;
  className?: string;
}> = ({
  title,
  showBackButton = false,
  onBackClick,
  actions = [],
  navigationProps,
  className
}) => {
  const { isMobile } = useViewport();
  
  if (!isMobile) return null;

  return (
    <div className={cn(
      'flex items-center justify-between p-4 bg-white border-b border-gray-200',
      'sticky top-0 z-50',
      className
    )}>
      {/* 左侧：导航按钮或返回按钮 */}
      <div className="flex items-center space-x-3">
        {showBackButton ? (
          <MobileButton
            variant="ghost"
            size="icon"
            onClick={onBackClick}
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
          </MobileButton>
        ) : navigationProps ? (
          <MobileNavigation {...navigationProps} />
        ) : null}
        
        {title && (
          <h1 className="text-lg font-semibold truncate">
            {title}
          </h1>
        )}
      </div>
      
      {/* 右侧：操作按钮 */}
      {actions.length > 0 && (
        <div className="flex items-center space-x-2">
          {actions.map((action, index) => (
            <MobileButton
              key={index}
              variant="ghost"
              size="icon"
              onClick={action.onClick}
              badge={action.badge}
              aria-label={action.label}
            >
              {action.icon}
            </MobileButton>
          ))}
        </div>
      )}
    </div>
  );
};

// 预设的导航项配置
export const DEFAULT_NAVIGATION_ITEMS: NavigationItem[] = [
  {
    id: 'dashboard',
    label: '仪表板',
    icon: DEFAULT_ICONS.home,
    href: '/'
  },
  {
    id: 'analytics',
    label: '数据分析',
    icon: DEFAULT_ICONS.analytics,
    children: [
      {
        id: 'grade-analysis',
        label: '成绩分析',
        href: '/analysis/grades'
      },
      {
        id: 'class-comparison',
        label: '班级对比',
        href: '/analysis/classes'
      },
      {
        id: 'trend-analysis',
        label: '趋势分析',
        href: '/analysis/trends'
      }
    ]
  },
  {
    id: 'students',
    label: '学生管理',
    icon: DEFAULT_ICONS.users,
    href: '/students'
  },
  {
    id: 'settings-section',
    label: '',
    divider: true
  },
  {
    id: 'settings',
    label: '设置',
    icon: DEFAULT_ICONS.settings,
    href: '/settings'
  },
  {
    id: 'help',
    label: '帮助',
    icon: DEFAULT_ICONS.help,
    href: '/help'
  }
];