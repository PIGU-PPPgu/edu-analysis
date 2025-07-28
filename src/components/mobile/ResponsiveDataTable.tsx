/**
 * 📱 响应式数据表格组件
 * 在桌面端显示表格，在移动端自动切换为卡片布局
 */

import React, { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useViewport } from "@/hooks/use-viewport";
import { useTouch } from "@/hooks/use-touch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MobileButton } from "./MobileButton";
import {
  MobileDataCard,
  GradeDataCard,
  MobileCardList,
} from "./MobileDataCard";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  Filter,
  RotateCcw,
  Grid,
  List as ListIcon,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

// 表格列定义
export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
  className?: string;
  priority?: "high" | "medium" | "low"; // 移动端显示优先级
  mobileHidden?: boolean; // 移动端是否隐藏
}

// 筛选器配置
export interface FilterConfig {
  key: string;
  label: string;
  type: "select" | "range" | "search" | "date";
  options?: Array<{ label: string; value: string }>;
  placeholder?: string;
}

// 响应式表格属性
export interface ResponsiveDataTableProps<T = any> {
  data: T[];
  columns: TableColumn[];
  loading?: boolean;
  className?: string;

  // 分页
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };

  // 筛选
  filters?: FilterConfig[];
  onFilter?: (filters: Record<string, any>) => void;

  // 排序
  sortable?: boolean;
  onSort?: (key: string, direction: "asc" | "desc") => void;

  // 选择
  selectable?: boolean;
  selectedKeys?: string[];
  onSelect?: (keys: string[]) => void;
  rowKey?: string;

  // 移动端特定
  mobileCardRenderer?: (item: T, index: number) => React.ReactNode;
  mobileViewToggle?: boolean; // 是否显示视图切换按钮

  // 操作
  actions?: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: (row: T) => void;
    variant?: "default" | "destructive";
  }>;

  // 其他
  emptyText?: string;
  onRowClick?: (row: T) => void;
}

// 默认的移动端卡片渲染器
const defaultMobileCardRenderer = <T extends Record<string, any>>(
  item: T,
  columns: TableColumn[],
  onRowClick?: (row: T) => void
): React.ReactNode => {
  // 提取关键字段
  const titleField =
    columns.find((col) => col.priority === "high") || columns[0];
  const subtitleField = columns.find(
    (col) => col.key === "subtitle" || col.key === "description"
  );

  // 构建卡片数据
  const cardData = {
    id: item[titleField.key] || item.id,
    title: titleField.render
      ? titleField.render(item[titleField.key], item)
      : item[titleField.key],
    subtitle: subtitleField
      ? subtitleField.render
        ? subtitleField.render(item[subtitleField.key], item)
        : item[subtitleField.key]
      : undefined,
    fields: columns
      .filter(
        (col) =>
          !col.mobileHidden &&
          col.key !== titleField.key &&
          col.key !== subtitleField?.key
      )
      .map((col) => ({
        key: col.key,
        label: col.label,
        value: col.render ? col.render(item[col.key], item) : item[col.key],
        priority: col.priority || "medium",
      })),
  };

  return (
    <MobileDataCard
      key={item.id || item[titleField.key]}
      data={cardData}
      onTap={onRowClick ? () => onRowClick(item) : undefined}
      className="mb-3"
    />
  );
};

export const ResponsiveDataTable = <T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  className,
  pagination,
  filters,
  onFilter,
  sortable = true,
  onSort,
  selectable = false,
  selectedKeys = [],
  onSelect,
  rowKey = "id",
  mobileCardRenderer,
  mobileViewToggle = true,
  actions,
  emptyText = "暂无数据",
  onRowClick,
}: ResponsiveDataTableProps<T>) => {
  const { isMobile, isTablet } = useViewport();
  const [currentPage, setCurrentPage] = useState(pagination?.current || 1);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);
  const [filterValues, setFilterValues] = useState<Record<string, any>>({});
  const [searchValue, setSearchValue] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [showFilters, setShowFilters] = useState(false);

  // 强制在移动端使用卡片视图
  const effectiveViewMode = isMobile ? "card" : viewMode;

  // 触摸处理
  const { touchHandlers } = useTouch({
    enableMultiTouch: false,
    preventScroll: false,
  });

  // 筛选后的数据
  const filteredData = useMemo(() => {
    let result = [...data];

    // 搜索筛选
    if (searchValue.trim()) {
      result = result.filter((item) =>
        Object.values(item).some((value) =>
          String(value).toLowerCase().includes(searchValue.toLowerCase())
        )
      );
    }

    // 自定义筛选
    Object.entries(filterValues).forEach(([key, value]) => {
      if (value && value !== "all") {
        result = result.filter((item) => {
          const itemValue = item[key];
          if (Array.isArray(value)) {
            return value.includes(itemValue);
          }
          return String(itemValue) === String(value);
        });
      }
    });

    return result;
  }, [data, searchValue, filterValues]);

  // 排序后的数据
  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig]);

  // 分页数据
  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;

    const startIndex = (currentPage - 1) * pagination.pageSize;
    return sortedData.slice(startIndex, startIndex + pagination.pageSize);
  }, [sortedData, currentPage, pagination]);

  // 处理排序
  const handleSort = useCallback(
    (key: string) => {
      if (!sortable) return;

      const newDirection =
        sortConfig?.key === key && sortConfig.direction === "asc"
          ? "desc"
          : "asc";
      const newSortConfig = { key, direction: newDirection };

      setSortConfig(newSortConfig);
      onSort?.(key, newDirection);
    },
    [sortConfig, sortable, onSort]
  );

  // 处理筛选
  const handleFilterChange = useCallback(
    (key: string, value: any) => {
      const newFilters = { ...filterValues, [key]: value };
      setFilterValues(newFilters);
      onFilter?.(newFilters);
    },
    [filterValues, onFilter]
  );

  // 处理页码变化
  const handlePageChange = useCallback(
    (page: number) => {
      setCurrentPage(page);
      pagination?.onChange(page, pagination.pageSize);
    },
    [pagination]
  );

  // 清空筛选
  const clearFilters = useCallback(() => {
    setFilterValues({});
    setSearchValue("");
    onFilter?.({});
  }, [onFilter]);

  // 渲染筛选器
  const renderFilters = () => {
    if (!filters || filters.length === 0) return null;

    const filterContent = (
      <div className="space-y-4">
        {/* 搜索框 */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="搜索..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* 筛选器 */}
        {filters.map((filter) => (
          <div key={filter.key} className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              {filter.label}
            </label>

            {filter.type === "select" && (
              <Select
                value={filterValues[filter.key] || "all"}
                onValueChange={(value) => handleFilterChange(filter.key, value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={filter.placeholder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  {filter.options?.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        ))}

        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="flex-1"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            重置
          </Button>
        </div>
      </div>
    );

    if (isMobile) {
      return (
        <Sheet open={showFilters} onOpenChange={setShowFilters}>
          <SheetContent side="bottom" className="h-[80vh]">
            <SheetHeader>
              <SheetTitle>筛选条件</SheetTitle>
              <SheetDescription>设置筛选条件来查找特定数据</SheetDescription>
            </SheetHeader>
            <div className="mt-6">{filterContent}</div>
          </SheetContent>
        </Sheet>
      );
    }

    return (
      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filterContent}
        </div>
      </div>
    );
  };

  // 渲染工具栏
  const renderToolbar = () => {
    return (
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          {/* 筛选按钮 */}
          {filters &&
            filters.length > 0 &&
            (isMobile ? (
              <MobileButton
                variant="outline"
                size="default"
                onClick={() => setShowFilters(true)}
                iconLeft={<SlidersHorizontal className="w-4 h-4" />}
              >
                筛选
              </MobileButton>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4 mr-2" />
                筛选
              </Button>
            ))}

          {/* 搜索框 (桌面端) */}
          {!isMobile && (
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* 视图切换 (仅平板和桌面) */}
          {!isMobile && mobileViewToggle && (
            <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
              >
                <ListIcon className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "card" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("card")}
              >
                <Grid className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* 导出按钮 */}
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            导出
          </Button>
        </div>
      </div>
    );
  };

  // 渲染表格视图
  const renderTableView = () => {
    if (loading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      );
    }

    if (paginatedData.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-500">{emptyText}</p>
        </div>
      );
    }

    return (
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={selectedKeys.length === paginatedData.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onSelect?.(paginatedData.map((item) => item[rowKey]));
                      } else {
                        onSelect?.([]);
                      }
                    }}
                  />
                </TableHead>
              )}

              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={cn(
                    column.className,
                    column.sortable &&
                      sortable &&
                      "cursor-pointer hover:bg-gray-50"
                  )}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {sortConfig?.key === column.key && (
                      <span className="text-xs">
                        {sortConfig.direction === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                </TableHead>
              ))}

              {actions && actions.length > 0 && (
                <TableHead className="w-24">操作</TableHead>
              )}
            </TableRow>
          </TableHeader>

          <TableBody>
            {paginatedData.map((item, index) => (
              <TableRow
                key={item[rowKey] || index}
                className={cn(
                  "hover:bg-gray-50",
                  onRowClick && "cursor-pointer",
                  selectedKeys.includes(item[rowKey]) && "bg-blue-50"
                )}
                onClick={() => onRowClick?.(item)}
              >
                {selectable && (
                  <TableCell>
                    <input
                      type="checkbox"
                      className="rounded"
                      checked={selectedKeys.includes(item[rowKey])}
                      onChange={(e) => {
                        const newSelected = e.target.checked
                          ? [...selectedKeys, item[rowKey]]
                          : selectedKeys.filter((key) => key !== item[rowKey]);
                        onSelect?.(newSelected);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableCell>
                )}

                {columns.map((column) => (
                  <TableCell key={column.key} className={column.className}>
                    {column.render
                      ? column.render(item[column.key], item)
                      : item[column.key]}
                  </TableCell>
                ))}

                {actions && actions.length > 0 && (
                  <TableCell>
                    <div className="flex space-x-1">
                      {actions.map((action, actionIndex) => (
                        <Button
                          key={actionIndex}
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            action.onClick(item);
                          }}
                        >
                          {action.icon}
                        </Button>
                      ))}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  // 渲染卡片视图
  const renderCardView = () => {
    if (loading) {
      return (
        <MobileCardList spacing="normal">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </MobileCardList>
      );
    }

    if (paginatedData.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-500">{emptyText}</p>
        </div>
      );
    }

    return (
      <MobileCardList spacing="normal" {...touchHandlers}>
        {paginatedData.map((item, index) => {
          if (mobileCardRenderer) {
            return mobileCardRenderer(item, index);
          }
          return defaultMobileCardRenderer(item, columns, onRowClick);
        })}
      </MobileCardList>
    );
  };

  // 渲染分页
  const renderPagination = () => {
    if (!pagination || pagination.total <= pagination.pageSize) return null;

    const totalPages = Math.ceil(pagination.total / pagination.pageSize);
    const canPrev = currentPage > 1;
    const canNext = currentPage < totalPages;

    return (
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-600">
          共 {pagination.total} 条，第 {currentPage} / {totalPages} 页
        </div>

        <div className="flex items-center space-x-2">
          {isMobile ? (
            <>
              <MobileButton
                variant="outline"
                size="sm"
                disabled={!canPrev}
                onClick={() => handlePageChange(currentPage - 1)}
                iconLeft={<ChevronLeft className="w-4 h-4" />}
              >
                上一页
              </MobileButton>
              <MobileButton
                variant="outline"
                size="sm"
                disabled={!canNext}
                onClick={() => handlePageChange(currentPage + 1)}
                iconRight={<ChevronRight className="w-4 h-4" />}
              >
                下一页
              </MobileButton>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={!canPrev}
                onClick={() => handlePageChange(currentPage - 1)}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                上一页
              </Button>

              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <Button
                      key={page}
                      variant={page === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                disabled={!canNext}
                onClick={() => handlePageChange(currentPage + 1)}
              >
                下一页
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={cn("w-full", className)}>
      {renderToolbar()}
      {!isMobile && showFilters && renderFilters()}
      {renderFilters()}

      {effectiveViewMode === "table" ? renderTableView() : renderCardView()}

      {renderPagination()}
    </div>
  );
};
