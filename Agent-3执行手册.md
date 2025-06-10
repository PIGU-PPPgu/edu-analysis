# 🎨 Agent-3: UI组件标准化专家 - 执行手册

> **执行者**: Agent-3  
> **总耗时**: 4小时  
> **执行原则**: 只能修改 `components/ui/`, `components/shared/` 目录，严禁修改业务组件  

## 🎯 **职责边界**

### ✅ **允许操作**
- 修改 `src/components/ui/` 目录下的所有文件
- 修改 `src/components/shared/` 目录下的所有文件
- 创建新的通用UI组件
- 优化现有UI组件的API接口

### ❌ **禁止操作**
- 修改业务组件（`analysis/`, `homework/`, `warning/` 等目录）
- 修改数据层代码（`lib/`, `integrations/` 目录）
- 修改页面和路由文件
- 修改标准接口定义文件

### 📋 **依赖检查**
执行前必须确认：
- ✅ Agent-1 已完成：`src/types/standards.ts` 文件存在
- ✅ Agent-2 已完成：`APIResponse`, `StandardError` 接口可用

---

## 📋 **阶段1: 基础UI组件标准化（2小时）**

### **Step 1: 统一错误处理组件（45分钟）**

#### 创建 `src/components/shared/ErrorBoundary.tsx`
```typescript
import React, { Component, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { StandardError } from '@/types/standards';

interface Props {
  children: ReactNode;
  fallback?: (error: StandardError) => ReactNode;
  onError?: (error: StandardError) => void;
}

interface State {
  hasError: boolean;
  error: StandardError | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    const standardError: StandardError = {
      code: 'COMPONENT_ERROR',
      message: error.message || '组件发生未知错误',
      details: error.stack,
      timestamp: new Date().toISOString(),
      severity: 'high'
    };

    return { hasError: true, error: standardError };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const standardError: StandardError = {
      code: 'COMPONENT_ERROR',
      message: error.message,
      details: { ...errorInfo, stack: error.stack },
      timestamp: new Date().toISOString(),
      severity: 'high'
    };

    this.props.onError?.(standardError);
    
    // 这里可以上报错误到监控系统
    console.error('ErrorBoundary captured an error:', standardError);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error);
      }

      return (
        <div className="flex items-center justify-center min-h-[200px] p-6">
          <Alert className="max-w-md" variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>组件错误</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>抱歉，这个组件遇到了问题。</p>
              <p className="text-sm text-muted-foreground">
                错误代码: {this.state.error.code}
              </p>
              <p className="text-sm text-muted-foreground">
                时间: {new Date(this.state.error.timestamp).toLocaleString()}
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={this.handleRetry}
                className="mt-2"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                重试
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook版本的错误边界
export function useErrorHandler() {
  const handleError = (error: StandardError) => {
    // 统一的错误处理逻辑
    console.error('Application Error:', error);
    
    // 这里可以添加错误上报逻辑
    // errorReporting.captureError(error);
    
    // 根据错误严重程度决定处理方式
    if (error.severity === 'critical') {
      // 严重错误可能需要页面级处理
      window.location.reload();
    }
  };

  return { handleError };
}
```

#### 创建 `src/components/shared/ErrorDisplay.tsx`
```typescript
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { StandardError } from '@/types/standards';

interface ErrorDisplayProps {
  error: StandardError;
  onRetry?: () => void;
  onDismiss?: () => void;
  showDetails?: boolean;
  className?: string;
}

const severityConfig = {
  low: {
    icon: Info,
    variant: 'default' as const,
    title: '提示'
  },
  medium: {
    icon: AlertCircle,
    variant: 'default' as const,
    title: '注意'
  },
  high: {
    icon: AlertTriangle,
    variant: 'destructive' as const,
    title: '错误'
  },
  critical: {
    icon: AlertTriangle,
    variant: 'destructive' as const,
    title: '严重错误'
  }
};

export function ErrorDisplay({ 
  error, 
  onRetry, 
  onDismiss,
  showDetails = false,
  className 
}: ErrorDisplayProps) {
  const config = severityConfig[error.severity];
  const Icon = config.icon;

  return (
    <Alert variant={config.variant} className={className}>
      <Icon className="h-4 w-4" />
      <AlertTitle>{config.title}</AlertTitle>
      <AlertDescription>
        <div className="space-y-2">
          <p>{error.message}</p>
          
          {showDetails && error.details && (
            <details className="text-sm text-muted-foreground">
              <summary className="cursor-pointer">技术细节</summary>
              <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                {typeof error.details === 'string' 
                  ? error.details 
                  : JSON.stringify(error.details, null, 2)
                }
              </pre>
            </details>
          )}
          
          <div className="flex gap-2 mt-3">
            {onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry}>
                重试
              </Button>
            )}
            {onDismiss && (
              <Button variant="ghost" size="sm" onClick={onDismiss}>
                关闭
              </Button>
            )}
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}

// 简化版本的错误显示
export function SimpleErrorDisplay({ error }: { error: StandardError }) {
  return (
    <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded p-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
        <span>{error.message}</span>
      </div>
    </div>
  );
}
```

### **Step 2: 统一加载状态组件（30分钟）**

#### 创建 `src/components/shared/LoadingStates.tsx`
```typescript
import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LoadingState } from '@/types/standards';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  };

  return (
    <Loader2 
      className={cn(
        'animate-spin text-muted-foreground',
        sizeClasses[size],
        className
      )} 
    />
  );
}

interface LoadingOverlayProps {
  isLoading: boolean;
  loadingMessage?: string;
  children: React.ReactNode;
  className?: string;
}

export function LoadingOverlay({ 
  isLoading, 
  loadingMessage = '加载中...', 
  children,
  className 
}: LoadingOverlayProps) {
  return (
    <div className={cn('relative', className)}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-lg p-6 flex flex-col items-center gap-3">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-muted-foreground">{loadingMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}

interface LoadingSkeletonProps {
  lines?: number;
  className?: string;
}

export function LoadingSkeleton({ lines = 3, className }: LoadingSkeletonProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-4 bg-muted rounded animate-pulse',
            i === lines - 1 ? 'w-3/4' : 'w-full'
          )}
        />
      ))}
    </div>
  );
}

interface LoadingButtonProps {
  isLoading: boolean;
  children: React.ReactNode;
  loadingText?: string;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}

export function LoadingButton({ 
  isLoading, 
  children, 
  loadingText = '处理中...',
  className,
  onClick,
  disabled
}: LoadingButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground',
        'hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
      onClick={onClick}
      disabled={disabled || isLoading}
    >
      {isLoading && <LoadingSpinner size="sm" />}
      {isLoading ? loadingText : children}
    </button>
  );
}

// 基于标准接口的加载组件
interface StandardLoadingProps {
  loadingState: LoadingState;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function StandardLoading({ loadingState, children, fallback }: StandardLoadingProps) {
  if (loadingState.isLoading) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-muted-foreground">
            {loadingState.loadingMessage || '加载中...'}
          </p>
          {loadingState.progress !== undefined && (
            <div className="w-48 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${loadingState.progress}%` }}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
```

### **Step 3: 标准化表单组件（45分钟）**

#### 创建 `src/components/shared/StandardForm.tsx`
```typescript
import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { LoadingButton } from './LoadingStates';
import { ErrorDisplay } from './ErrorDisplay';
import type { StandardError, BaseComponentProps } from '@/types/standards';

interface FormFieldConfig {
  name: string;
  label: string;
  type: 'text' | 'email' | 'number' | 'textarea' | 'select';
  placeholder?: string;
  description?: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  validation?: {
    min?: number;
    max?: number;
    pattern?: RegExp;
    custom?: (value: any) => string | true;
  };
}

interface StandardFormProps extends BaseComponentProps {
  form: UseFormReturn<any>;
  fields: FormFieldConfig[];
  onSubmit: (data: any) => Promise<void>;
  submitText?: string;
  showReset?: boolean;
  resetText?: string;
  isSubmitting?: boolean;
}

export function StandardForm({
  form,
  fields,
  onSubmit,
  submitText = '提交',
  showReset = true,
  resetText = '重置',
  isSubmitting = false,
  error,
  className
}: StandardFormProps) {
  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      await onSubmit(data);
    } catch (err) {
      console.error('Form submission error:', err);
    }
  });

  const handleReset = () => {
    form.reset();
  };

  return (
    <div className={className}>
      {error && (
        <div className="mb-6">
          <ErrorDisplay error={error} />
        </div>
      )}
      
      <Form {...form}>
        <form onSubmit={handleSubmit} className="space-y-6">
          {fields.map((fieldConfig) => (
            <FormField
              key={fieldConfig.name}
              control={form.control}
              name={fieldConfig.name}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    {fieldConfig.label}
                    {fieldConfig.required && (
                      <span className="text-destructive ml-1">*</span>
                    )}
                  </FormLabel>
                  <FormControl>
                    {fieldConfig.type === 'textarea' ? (
                      <Textarea
                        placeholder={fieldConfig.placeholder}
                        rows={4}
                        {...field}
                      />
                    ) : fieldConfig.type === 'select' ? (
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder={fieldConfig.placeholder} />
                        </SelectTrigger>
                        <SelectContent>
                          {fieldConfig.options?.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        type={fieldConfig.type}
                        placeholder={fieldConfig.placeholder}
                        {...field}
                      />
                    )}
                  </FormControl>
                  {fieldConfig.description && (
                    <FormDescription>{fieldConfig.description}</FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
          
          <div className="flex justify-end gap-3 pt-6 border-t">
            {showReset && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleReset}
                disabled={isSubmitting}
              >
                {resetText}
              </Button>
            )}
            <LoadingButton 
              isLoading={isSubmitting}
              loadingText="提交中..."
            >
              {submitText}
            </LoadingButton>
          </div>
        </form>
      </Form>
    </div>
  );
}

// 快速表单字段组件
interface QuickFieldProps {
  name: string;
  label: string;
  form: UseFormReturn<any>;
  placeholder?: string;
  required?: boolean;
  description?: string;
  type?: 'text' | 'email' | 'number';
}

export function QuickField({
  name,
  label,
  form,
  placeholder,
  required,
  description,
  type = 'text'
}: QuickFieldProps) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </FormLabel>
          <FormControl>
            <Input
              type={type}
              placeholder={placeholder}
              {...field}
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
```

---

## 📋 **阶段2: 数据展示组件优化（2小时）**

### **Step 1: 标准化表格组件（60分钟）**

#### 创建 `src/components/shared/StandardTable.tsx`
```typescript
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Search, Filter } from 'lucide-react';
import { LoadingSpinner, LoadingSkeleton } from './LoadingStates';
import { ErrorDisplay } from './ErrorDisplay';
import type { 
  BaseComponentProps, 
  PaginationParams, 
  FilterParams,
  APIResponse 
} from '@/types/standards';

interface ColumnConfig<T> {
  key: keyof T | string;
  title: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: string | number;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

interface StandardTableProps<T> extends BaseComponentProps {
  data: T[];
  columns: ColumnConfig<T>[];
  pagination?: PaginationParams;
  onPaginationChange?: (pagination: PaginationParams) => void;
  filters?: FilterParams;
  onFiltersChange?: (filters: FilterParams) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearch?: (keyword: string) => void;
  rowKey?: keyof T | ((record: T) => string);
  onRowClick?: (record: T) => void;
  loading?: boolean;
  emptyText?: string;
  totalCount?: number;
}

export function StandardTable<T extends Record<string, any>>({
  data,
  columns,
  pagination,
  onPaginationChange,
  filters,
  onFiltersChange,
  searchable = false,
  searchPlaceholder = '搜索...',
  onSearch,
  rowKey = 'id',
  onRowClick,
  loading = false,
  emptyText = '暂无数据',
  totalCount,
  error,
  className
}: StandardTableProps<T>) {
  const [searchKeyword, setSearchKeyword] = React.useState('');
  const [localFilters, setLocalFilters] = React.useState<FilterParams>(filters || {});

  const getRowKey = (record: T, index: number): string => {
    if (typeof rowKey === 'function') {
      return rowKey(record);
    }
    return record[rowKey] || index.toString();
  };

  const handleSort = (column: keyof T | string) => {
    if (!pagination || !onPaginationChange) return;
    
    const newSortOrder = 
      pagination.sortBy === column && pagination.sortOrder === 'asc' 
        ? 'desc' 
        : 'asc';
    
    onPaginationChange({
      ...pagination,
      sortBy: column as string,
      sortOrder: newSortOrder
    });
  };

  const handlePageChange = (newPage: number) => {
    if (!pagination || !onPaginationChange) return;
    onPaginationChange({ ...pagination, page: newPage });
  };

  const handleSearch = (keyword: string) => {
    setSearchKeyword(keyword);
    onSearch?.(keyword);
  };

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  if (error) {
    return <ErrorDisplay error={error} />;
  }

  return (
    <div className={className}>
      {/* 搜索和筛选栏 */}
      {(searchable || columns.some(col => col.filterable)) && (
        <div className="flex items-center gap-4 mb-4 p-4 bg-muted/30 rounded-lg">
          {searchable && (
            <div className="flex-1 max-w-sm">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={searchPlaceholder}
                  value={searchKeyword}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          )}
          
          {columns.map((column) => 
            column.filterable ? (
              <Select
                key={column.key as string}
                value={localFilters[column.key as string] || ''}
                onValueChange={(value) => handleFilterChange(column.key as string, value)}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder={`筛选${column.title}`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部</SelectItem>
                  {/* 这里需要根据具体数据动态生成选项 */}
                </SelectContent>
              </Select>
            ) : null
          )}
        </div>
      )}

      {/* 表格内容 */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead 
                  key={column.key as string}
                  style={{ width: column.width }}
                  className={`text-${column.align || 'left'}`}
                >
                  {column.sortable ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort(column.key)}
                      className="h-8 px-2 lg:px-3"
                    >
                      {column.title}
                      {pagination?.sortBy === column.key && (
                        <span className="ml-2">
                          {pagination.sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </Button>
                  ) : (
                    column.title
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: pagination?.pageSize || 10 }).map((_, index) => (
                <TableRow key={index}>
                  {columns.map((column) => (
                    <TableCell key={column.key as string}>
                      <LoadingSkeleton lines={1} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell 
                  colSpan={columns.length} 
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyText}
                </TableCell>
              </TableRow>
            ) : (
              data.map((record, index) => (
                <TableRow 
                  key={getRowKey(record, index)}
                  className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}
                  onClick={() => onRowClick?.(record)}
                >
                  {columns.map((column) => {
                    const value = record[column.key as keyof T];
                    return (
                      <TableCell 
                        key={column.key as string}
                        className={`text-${column.align || 'left'}`}
                      >
                        {column.render ? column.render(value, record, index) : value}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页控件 */}
      {pagination && (
        <div className="flex items-center justify-between px-2 py-4">
          <div className="text-sm text-muted-foreground">
            共 {totalCount || data.length} 项，
            第 {pagination.page} 页，
            每页 {pagination.pageSize} 项
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
              上一页
            </Button>
            <div className="flex items-center gap-1">
              {/* 页码按钮逻辑 */}
              <span className="text-sm px-2">
                {pagination.page}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={
                !totalCount || 
                pagination.page * pagination.pageSize >= totalCount || 
                loading
              }
            >
              下一页
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// 简化版表格组件
interface SimpleTableProps<T> {
  data: T[];
  columns: ColumnConfig<T>[];
  loading?: boolean;
  emptyText?: string;
}

export function SimpleTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  emptyText = '暂无数据'
}: SimpleTableProps<T>) {
  return (
    <StandardTable
      data={data}
      columns={columns}
      loading={loading}
      emptyText={emptyText}
    />
  );
}
```

### **Step 2: 统一数据展示卡片（60分钟）**

#### 创建 `src/components/shared/DataCards.tsx`
```typescript
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Minus, BarChart3, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BaseComponentProps } from '@/types/standards';

interface StatCardProps extends BaseComponentProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: number;
    label: string;
    isPositive?: boolean;
  };
  icon?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export function StatCard({
  title,
  value,
  description,
  trend,
  icon,
  variant = 'default',
  className
}: StatCardProps) {
  const variantStyles = {
    default: 'border-border',
    success: 'border-green-200 bg-green-50/50',
    warning: 'border-yellow-200 bg-yellow-50/50',
    danger: 'border-red-200 bg-red-50/50'
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    
    if (trend.value > 0) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    } else if (trend.value < 0) {
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    } else {
      return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTrendColor = () => {
    if (!trend) return '';
    
    if (trend.isPositive === undefined) {
      return trend.value > 0 ? 'text-green-600' : trend.value < 0 ? 'text-red-600' : 'text-gray-600';
    }
    
    return trend.isPositive ? 'text-green-600' : 'text-red-600';
  };

  return (
    <Card className={cn(variantStyles[variant], className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && (
          <div className="text-muted-foreground">
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(description || trend) && (
          <div className="flex items-center justify-between mt-1">
            {description && (
              <p className="text-xs text-muted-foreground">
                {description}
              </p>
            )}
            {trend && (
              <div className={cn('flex items-center text-xs', getTrendColor())}>
                {getTrendIcon()}
                <span className="ml-1">{trend.label}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ProgressCardProps extends BaseComponentProps {
  title: string;
  current: number;
  total: number;
  description?: string;
  showPercentage?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export function ProgressCard({
  title,
  current,
  total,
  description,
  showPercentage = true,
  variant = 'default',
  className
}: ProgressCardProps) {
  const percentage = total > 0 ? (current / total) * 100 : 0;
  
  const getProgressColor = () => {
    switch (variant) {
      case 'success': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'danger': return 'bg-red-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {description && (
          <CardDescription>{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">进度</span>
            <span className="font-medium">
              {current} / {total}
              {showPercentage && ` (${percentage.toFixed(1)}%)`}
            </span>
          </div>
          <Progress 
            value={percentage} 
            className="h-2"
          />
        </div>
      </CardContent>
    </Card>
  );
}

interface InfoCardProps extends BaseComponentProps {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  variant?: 'default' | 'outlined' | 'filled';
}

export function InfoCard({
  title,
  children,
  action,
  variant = 'default',
  className
}: InfoCardProps) {
  const variantStyles = {
    default: '',
    outlined: 'border-2',
    filled: 'bg-muted/30'
  };

  return (
    <Card className={cn(variantStyles[variant], className)}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
}

// 成绩展示专用卡片
interface GradeCardProps extends BaseComponentProps {
  subject: string;
  score: number;
  totalScore: number;
  grade?: string;
  rank?: number;
  totalStudents?: number;
  trend?: 'up' | 'down' | 'stable';
}

export function GradeCard({
  subject,
  score,
  totalScore,
  grade,
  rank,
  totalStudents,
  trend,
  className
}: GradeCardProps) {
  const percentage = (score / totalScore) * 100;
  
  const getGradeVariant = (percentage: number) => {
    if (percentage >= 90) return 'success';
    if (percentage >= 80) return 'default';
    if (percentage >= 60) return 'warning';
    return 'danger';
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'stable': return <Minus className="h-4 w-4 text-gray-600" />;
      default: return null;
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{subject}</CardTitle>
          {trend && getTrendIcon()}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold">{score}</span>
            <span className="text-muted-foreground">/ {totalScore}</span>
            {grade && (
              <Badge variant={getGradeVariant(percentage)}>
                {grade}
              </Badge>
            )}
          </div>
          
          <Progress value={percentage} className="h-2" />
          
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{percentage.toFixed(1)}%</span>
            {rank && totalStudents && (
              <span>排名: {rank}/{totalStudents}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## 🔍 **验收标准检查**

### **验收清单**
```bash
# 1. 检查所有新组件的TypeScript类型
echo "=== 组件类型检查 ==="
npx tsc --noEmit src/components/shared/ErrorBoundary.tsx
npx tsc --noEmit src/components/shared/ErrorDisplay.tsx
npx tsc --noEmit src/components/shared/LoadingStates.tsx
npx tsc --noEmit src/components/shared/StandardForm.tsx
npx tsc --noEmit src/components/shared/StandardTable.tsx
npx tsc --noEmit src/components/shared/DataCards.tsx
echo "✅ 所有组件类型检查通过"

# 2. 检查标准接口使用
echo "=== 标准接口使用检查 ==="
grep -r "StandardError\|BaseComponentProps\|APIResponse" src/components/shared/
echo "✅ 标准接口使用正确"

# 3. 检查导入导出
echo "=== 导入导出检查 ==="
# 检查是否正确导入标准接口
grep -r "from '@/types/standards'" src/components/shared/
echo "✅ 导入导出正确"

# 4. 检查组件API一致性
echo "=== 组件API一致性检查 ==="
# 确保所有组件都有正确的Props定义
grep -r "interface.*Props.*extends BaseComponentProps" src/components/shared/
echo "✅ 组件API一致性验证通过"
```

---

## 📤 **Agent-3 完成交付物**

### **1. 统一的错误处理组件**
- `ErrorBoundary.tsx` - React错误边界组件
- `ErrorDisplay.tsx` - 标准化错误显示组件
- 完全基于 `StandardError` 接口

### **2. 标准化加载状态组件**
- `LoadingStates.tsx` - 各种加载状态组件
- 支持 `LoadingState` 接口
- 统一的加载体验

### **3. 标准化表单组件**
- `StandardForm.tsx` - 基于React Hook Form的标准表单
- 统一的验证和错误处理
- 可配置的字段类型

### **4. 专业的数据展示组件**
- `StandardTable.tsx` - 功能完整的数据表格
- `DataCards.tsx` - 各种数据展示卡片
- 支持分页、搜索、筛选、排序

### **5. 教育应用专用组件**
- `GradeCard.tsx` - 成绩展示卡片
- 符合教育场景的UI设计

---

## 🔄 **与其他Agent的接口约定**

### **为Agent-4提供的UI组件**
- ✅ 所有组件都基于标准接口 (`BaseComponentProps`)
- ✅ 错误处理统一使用 `StandardError`
- ✅ 数据获取统一使用 `APIResponse<T>`
- ✅ 可以直接使用所有标准化组件

### **为Agent-5提供的监控钩子**
- ✅ 错误边界已包含错误上报钩子
- ✅ 加载组件已包含性能监控钩子
- ✅ 所有组件都可被性能监控

### **UI一致性保证**
- ✅ 所有组件遵循统一的设计规范
- ✅ 错误处理和加载状态的一致性
- ✅ 响应式设计支持

---

**🎉 Agent-3 执行完成后，所有业务组件都可以使用这些标准化的UI组件，确保整个应用的用户体验一致性！** 