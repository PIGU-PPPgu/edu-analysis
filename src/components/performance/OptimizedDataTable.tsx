/**
 * 🚀 优化数据表格组件
 * 使用虚拟滚动、智能分页、懒加载等技术优化大数据表格性能
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Filter,
  Download,
  RotateCcw,
  Eye,
  EyeOff,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Settings,
  Loader2
} from 'lucide-react';
import {
  useVirtualScrolling,
  useOptimizedDebounce,
  useRenderPerformance,
  useLazyLoad
} from '@/utils/performanceOptimizer';

// 表格配置接口
export interface TableColumn<T = any> {
  key: string;
  title: string;
  dataIndex: keyof T;
  width?: number;
  fixed?: 'left' | 'right';
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  ellipsis?: boolean;
}

export interface TableConfig {
  virtual?: boolean;
  itemHeight?: number;
  pageSize?: number;
  showPagination?: boolean;
  showSearch?: boolean;
  showFilter?: boolean;
  showColumnSettings?: boolean;
  searchKeys?: string[];
  stickyHeader?: boolean;
  bordered?: boolean;
  striped?: boolean;
  compact?: boolean;
}

export interface OptimizedDataTableProps<T = any> {
  data: T[];
  columns: TableColumn<T>[];
  config?: TableConfig;
  loading?: boolean;
  className?: string;
  onRowClick?: (record: T, index: number) => void;
  onSelectionChange?: (selectedRows: T[]) => void;
  rowKey?: string | ((record: T) => string);
  emptyText?: string;
  title?: string;
  showExport?: boolean;
}

// 默认配置
const DEFAULT_CONFIG: TableConfig = {
  virtual: false,
  itemHeight: 60,
  pageSize: 50,
  showPagination: true,
  showSearch: true,
  showFilter: false,
  showColumnSettings: true,
  searchKeys: [],
  stickyHeader: true,
  bordered: true,
  striped: true,
  compact: false
};

// 排序类型
type SortOrder = 'asc' | 'desc' | null;

interface SortState {
  key: string;
  order: SortOrder;
}

// 虚拟化行组件
const VirtualRow: React.FC<{
  item: any;
  index: number;
  columns: TableColumn[];
  rowKey: string | ((record: any) => string);
  onRowClick?: (record: any, index: number) => void;
  isSelected?: boolean;
  onSelectionChange?: (selected: boolean) => void;
  compact?: boolean;
}> = React.memo(({
  item,
  index,
  columns,
  rowKey,
  onRowClick,
  isSelected,
  onSelectionChange,
  compact
}) => {
  const { renderStart, renderEnd } = useRenderPerformance(`VirtualRow-${index}`);
  
  useEffect(() => {
    renderStart();
    return renderEnd;
  });

  const handleClick = useCallback(() => {
    onRowClick?.(item, index);
  }, [item, index, onRowClick]);

  const handleSelectionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onSelectionChange?.(e.target.checked);
  }, [onSelectionChange]);

  const getRowKey = useCallback((record: any) => {
    return typeof rowKey === 'function' ? rowKey(record) : record[rowKey];
  }, [rowKey]);

  return (
    <tr 
      className={cn(
        "border-b border-black transition-colors cursor-pointer hover:bg-[#B9FF66]/20",
        isSelected && "bg-[#B9FF66]/30",
        index % 2 === 1 && "bg-gray-50"
      )}
      onClick={handleClick}
      data-row-key={getRowKey(item)}
    >
      {onSelectionChange && (
        <td className={cn("p-2 border-r border-black", compact && "p-1")}>
          <input
            type="checkbox"
            checked={isSelected || false}
            onChange={handleSelectionChange}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 border-2 border-black rounded focus:ring-[#B9FF66]"
          />
        </td>
      )}
      {columns.map((column) => (
        <td 
          key={column.key}
          className={cn(
            "p-3 border-r border-black font-medium text-black",
            compact && "p-2 text-sm",
            column.align === 'center' && "text-center",
            column.align === 'right' && "text-right",
            column.ellipsis && "truncate max-w-0"
          )}
          style={{ 
            width: column.width,
            minWidth: column.width 
          }}
        >
          {column.render 
            ? column.render(item[column.dataIndex], item, index)
            : String(item[column.dataIndex] || '')
          }
        </td>
      ))}
    </tr>
  );
});

VirtualRow.displayName = 'VirtualRow';

const OptimizedDataTable = <T extends Record<string, any>>({
  data,
  columns,
  config = {},
  loading = false,
  className,
  onRowClick,
  onSelectionChange,
  rowKey = 'id',
  emptyText = '暂无数据',
  title,
  showExport = true
}: OptimizedDataTableProps<T>) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const { renderStart, renderEnd } = useRenderPerformance('OptimizedDataTable');
  
  // 状态管理
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortState, setSortState] = useState<SortState>({ key: '', order: null });
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(columns.map(col => col.key))
  );
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  
  // 性能监控
  useEffect(() => {
    renderStart();
    return renderEnd;
  });

  // 优化的搜索防抖
  const debouncedSearch = useOptimizedDebounce((term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
  }, 300);

  // 过滤和搜索数据
  const filteredData = useMemo(() => {
    let result = [...data];
    
    // 搜索过滤
    if (searchTerm) {
      const searchKeys = finalConfig.searchKeys?.length 
        ? finalConfig.searchKeys 
        : columns.map(col => col.dataIndex as string);
        
      result = result.filter(item =>
        searchKeys.some(key =>
          String(item[key] || '').toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
    
    // 排序
    if (sortState.key && sortState.order) {
      result.sort((a, b) => {
        const aVal = a[sortState.key];
        const bVal = b[sortState.key];
        
        if (aVal === bVal) return 0;
        
        const comparison = aVal > bVal ? 1 : -1;
        return sortState.order === 'asc' ? comparison : -comparison;
      });
    }
    
    return result;
  }, [data, searchTerm, sortState, finalConfig.searchKeys, columns]);

  // 可见列过滤
  const visibleColumnsData = useMemo(() => {
    return columns.filter(col => visibleColumns.has(col.key));
  }, [columns, visibleColumns]);

  // 分页数据
  const paginatedData = useMemo(() => {
    if (!finalConfig.showPagination) return filteredData;
    
    const startIndex = (currentPage - 1) * finalConfig.pageSize!;
    return filteredData.slice(startIndex, startIndex + finalConfig.pageSize!);
  }, [filteredData, currentPage, finalConfig.pageSize, finalConfig.showPagination]);

  // 虚拟滚动
  const { visibleItems, totalHeight, offsetY, handleScroll } = useVirtualScrolling(
    finalConfig.virtual ? filteredData : paginatedData,
    finalConfig.itemHeight!,
    400, // 容器高度
    3    // 预渲染项目数
  );

  // 排序处理
  const handleSort = useCallback((columnKey: string) => {
    setSortState(prev => {
      if (prev.key !== columnKey) {
        return { key: columnKey, order: 'asc' };
      }
      
      switch (prev.order) {
        case null:
          return { key: columnKey, order: 'asc' };
        case 'asc':
          return { key: columnKey, order: 'desc' };
        case 'desc':
          return { key: '', order: null };
        default:
          return { key: '', order: null };
      }
    });
  }, []);

  // 选择处理
  const handleRowSelection = useCallback((rowKey: string, selected: boolean) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(rowKey);
      } else {
        newSet.delete(rowKey);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      const allKeys = paginatedData.map(item => 
        typeof rowKey === 'function' ? rowKey(item) : item[rowKey]
      );
      setSelectedRows(new Set(allKeys));
    } else {
      setSelectedRows(new Set());
    }
  }, [paginatedData, rowKey]);

  // 导出功能
  const handleExport = useCallback(() => {
    const headers = visibleColumnsData.map(col => col.title).join(',');
    const rows = filteredData.map(item => 
      visibleColumnsData.map(col => 
        String(item[col.dataIndex] || '')
      ).join(',')
    ).join('\n');
    
    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `table-export-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }, [filteredData, visibleColumnsData]);

  // 分页信息
  const totalPages = Math.ceil(filteredData.length / finalConfig.pageSize!);
  const startIndex = (currentPage - 1) * finalConfig.pageSize! + 1;
  const endIndex = Math.min(currentPage * finalConfig.pageSize!, filteredData.length);

  // 选中的行数据
  useEffect(() => {
    if (onSelectionChange) {
      const selectedData = filteredData.filter(item => {
        const key = typeof rowKey === 'function' ? rowKey(item) : item[rowKey];
        return selectedRows.has(key);
      });
      onSelectionChange(selectedData);
    }
  }, [selectedRows, filteredData, onSelectionChange, rowKey]);

  return (
    <Card className={cn(
      "border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66]",
      className
    )}>
      {/* 表格标题和工具栏 */}
      {(title || finalConfig.showSearch || showExport) && (
        <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {title && (
              <CardTitle className="text-black font-black flex items-center gap-2">
                {title}
                {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              </CardTitle>
            )}
            
            <div className="flex items-center gap-3">
              {finalConfig.showSearch && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
                  <Input
                    placeholder="搜索..."
                    className="pl-10 border-2 border-black bg-white font-medium"
                    onChange={(e) => debouncedSearch(e.target.value)}
                  />
                </div>
              )}
              
              {finalConfig.showColumnSettings && (
                <Button
                  onClick={() => setShowColumnSettings(!showColumnSettings)}
                  variant="outline"
                  size="sm"
                  className="border-2 border-black bg-white hover:bg-[#F3F3F3] text-black font-bold"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              )}
              
              {showExport && (
                <Button
                  onClick={handleExport}
                  variant="outline"
                  size="sm"
                  className="border-2 border-black bg-white hover:bg-[#F3F3F3] text-black font-bold"
                >
                  <Download className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
          
          {/* 数据统计 */}
          <div className="flex items-center gap-4 text-sm font-medium text-black">
            <span>总计: {filteredData.length} 条</span>
            {selectedRows.size > 0 && (
              <span>已选: {selectedRows.size} 条</span>
            )}
            {searchTerm && (
              <span>搜索: "{searchTerm}" 找到 {filteredData.length} 条结果</span>
            )}
          </div>
        </CardHeader>
      )}

      {/* 列设置面板 */}
      {showColumnSettings && (
        <div className="p-4 border-b-2 border-black bg-[#F9F9F9]">
          <h4 className="font-bold text-black mb-3">显示列</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {columns.map(column => (
              <label key={column.key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={visibleColumns.has(column.key)}
                  onChange={(e) => {
                    setVisibleColumns(prev => {
                      const newSet = new Set(prev);
                      if (e.target.checked) {
                        newSet.add(column.key);
                      } else {
                        newSet.delete(column.key);
                      }
                      return newSet;
                    });
                  }}
                  className="w-4 h-4 border-2 border-black rounded"
                />
                <span className="text-sm font-medium text-black">{column.title}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <CardContent className="p-0">
        {/* 表格容器 */}
        <div 
          ref={containerRef}
          className={cn(
            "overflow-auto",
            finalConfig.virtual && "h-96"
          )}
          onScroll={finalConfig.virtual ? handleScroll : undefined}
        >
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-[#B9FF66] mx-auto" />
                <p className="text-[#6B7280] font-medium">正在加载数据...</p>
              </div>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <Eye className="w-12 h-12 text-[#6B7280] mx-auto" />
                <p className="text-xl font-bold text-black">{emptyText}</p>
                <p className="text-[#6B7280] font-medium">
                  {searchTerm ? '尝试修改搜索条件' : '暂时没有可显示的数据'}
                </p>
              </div>
            </div>
          ) : (
            <table 
              ref={tableRef}
              className={cn(
                "w-full border-collapse",
                finalConfig.bordered && "border border-black"
              )}
            >
              {/* 表头 */}
              <thead className={cn(
                "bg-[#191A23] text-white",
                finalConfig.stickyHeader && "sticky top-0 z-10"
              )}>
                <tr>
                  {onSelectionChange && (
                    <th className="p-3 border-r border-white font-bold text-left">
                      <input
                        type="checkbox"
                        checked={paginatedData.length > 0 && selectedRows.size === paginatedData.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="w-4 h-4 border-2 border-white rounded"
                      />
                    </th>
                  )}
                  {visibleColumnsData.map((column) => (
                    <th 
                      key={column.key}
                      className={cn(
                        "p-3 border-r border-white font-bold",
                        column.align === 'center' && "text-center",
                        column.align === 'right' && "text-right",
                        column.sortable && "cursor-pointer hover:bg-white/10 transition-colors"
                      )}
                      style={{ 
                        width: column.width,
                        minWidth: column.width 
                      }}
                      onClick={column.sortable ? () => handleSort(column.key) : undefined}
                    >
                      <div className="flex items-center gap-2">
                        <span>{column.title}</span>
                        {column.sortable && (
                          <div className="flex flex-col">
                            {sortState.key === column.key ? (
                              sortState.order === 'asc' ? (
                                <ArrowUp className="w-4 h-4" />
                              ) : sortState.order === 'desc' ? (
                                <ArrowDown className="w-4 h-4" />
                              ) : (
                                <ArrowUpDown className="w-4 h-4 opacity-50" />
                              )
                            ) : (
                              <ArrowUpDown className="w-4 h-4 opacity-50" />
                            )}
                          </div>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              
              {/* 表体 */}
              <tbody className="bg-white">
                {finalConfig.virtual ? (
                  <>
                    {/* 虚拟滚动占位 */}
                    <tr style={{ height: totalHeight }}>
                      <td colSpan={visibleColumnsData.length + (onSelectionChange ? 1 : 0)} />
                    </tr>
                    {/* 可见行 */}
                    {visibleItems.map(({ item, index }) => (
                      <VirtualRow
                        key={typeof rowKey === 'function' ? rowKey(item) : item[rowKey]}
                        item={item}
                        index={index}
                        columns={visibleColumnsData}
                        rowKey={rowKey}
                        onRowClick={onRowClick}
                        isSelected={selectedRows.has(
                          typeof rowKey === 'function' ? rowKey(item) : item[rowKey]
                        )}
                        onSelectionChange={onSelectionChange ? (selected) => {
                          const key = typeof rowKey === 'function' ? rowKey(item) : item[rowKey];
                          handleRowSelection(key, selected);
                        } : undefined}
                        compact={finalConfig.compact}
                      />
                    ))}
                  </>
                ) : (
                  paginatedData.map((item, index) => (
                    <VirtualRow
                      key={typeof rowKey === 'function' ? rowKey(item) : item[rowKey]}
                      item={item}
                      index={index}
                      columns={visibleColumnsData}
                      rowKey={rowKey}
                      onRowClick={onRowClick}
                      isSelected={selectedRows.has(
                        typeof rowKey === 'function' ? rowKey(item) : item[rowKey]
                      )}
                      onSelectionChange={onSelectionChange ? (selected) => {
                        const key = typeof rowKey === 'function' ? rowKey(item) : item[rowKey];
                        handleRowSelection(key, selected);
                      } : undefined}
                      compact={finalConfig.compact}
                    />
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* 分页 */}
        {finalConfig.showPagination && !finalConfig.virtual && filteredData.length > 0 && (
          <div className="p-4 border-t-2 border-black bg-[#F9F9F9] flex items-center justify-between">
            <div className="text-sm font-medium text-black">
              显示 {startIndex} - {endIndex} 条，共 {filteredData.length} 条
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                variant="outline"
                size="sm"
                className="border-2 border-black bg-white hover:bg-[#F3F3F3] text-black font-bold disabled:opacity-50"
              >
                <ChevronsLeft className="w-4 h-4" />
              </Button>
              
              <Button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                variant="outline"
                size="sm"
                className="border-2 border-black bg-white hover:bg-[#F3F3F3] text-black font-bold disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, currentPage - 2) + i;
                  if (pageNum > totalPages) return null;
                  
                  return (
                    <Button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "w-8 h-8 p-0 border-2 border-black font-bold",
                        currentPage === pageNum 
                          ? "bg-[#B9FF66] hover:bg-[#B9FF66] text-black"
                          : "bg-white hover:bg-[#F3F3F3] text-black"
                      )}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                variant="outline"
                size="sm"
                className="border-2 border-black bg-white hover:bg-[#F3F3F3] text-black font-bold disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              
              <Button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                variant="outline"
                size="sm"
                className="border-2 border-black bg-white hover:bg-[#F3F3F3] text-black font-bold disabled:opacity-50"
              >
                <ChevronsRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OptimizedDataTable;