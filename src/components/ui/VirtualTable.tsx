// 🔧 虚拟滚动表格组件 - 高性能处理大数据集预览
// 解决大文件预览时的性能问题 - 增强版

import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { FixedSizeList as List, VariableSizeList as VariableList } from 'react-window';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronLeft, ChevronRight, Search, Eye, EyeOff, Filter, Download, RotateCcw } from 'lucide-react';

export interface VirtualTableProps {
  data: any[];
  headers: string[];
  className?: string;
  maxHeight?: number;
  rowHeight?: number;
  columnWidth?: number;
  showSearch?: boolean;
  showPagination?: boolean;
  pageSize?: number;
  onRowClick?: (row: any, index: number) => void;
  renderCell?: (value: any, columnKey: string, rowIndex: number) => React.ReactNode;
  // 🔧 新增性能优化选项
  enableVirtualization?: boolean;
  enableVariableHeight?: boolean;
  overscanCount?: number;
  // 🔧 新增功能选项
  showExport?: boolean;
  onExport?: (filteredData: any[]) => void;
  showColumnFilter?: boolean;
  sortable?: boolean;
  initialSort?: { column: string; direction: 'asc' | 'desc' };
  // 🔧 性能监控
  onPerformanceMetrics?: (metrics: PerformanceMetrics) => void;
}

interface PerformanceMetrics {
  renderTime: number;
  rowCount: number;
  columnCount: number;
  memoryUsage?: number;
}

interface VirtualTableState {
  filteredData: any[];
  searchTerm: string;
  currentPage: number;
  visibleColumns: Set<string>;
  columnWidths: Record<string, number>;
  // 🔧 新增状态
  sortConfig: { column: string; direction: 'asc' | 'desc' } | null;
  columnFilters: Record<string, string>;
  performanceMode: boolean;
  lastRenderTime: number;
}

export const VirtualTable: React.FC<VirtualTableProps> = ({
  data,
  headers,
  className = '',
  maxHeight = 400,
  rowHeight = 40,
  columnWidth = 120,
  showSearch = true,
  showPagination = false,
  pageSize = 1000,
  onRowClick,
  renderCell,
  // 🔧 新增props with defaults
  enableVirtualization = true,
  enableVariableHeight = false,
  overscanCount = 5,
  showExport = false,
  onExport,
  showColumnFilter = false,
  sortable = false,
  initialSort,
  onPerformanceMetrics
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);
  
  const [state, setState] = useState<VirtualTableState>({
    filteredData: data,
    searchTerm: '',
    currentPage: 0,
    visibleColumns: new Set(headers),
    columnWidths: headers.reduce((acc, header) => {
      acc[header] = Math.max(columnWidth, (header.length + 2) * 8);
      return acc;
    }, {} as Record<string, number>),
    // 🔧 新增状态初始化
    sortConfig: initialSort || null,
    columnFilters: {},
    performanceMode: data.length > 10000, // 超过10k条数据启用性能模式
    lastRenderTime: 0
  });

  // 响应式容器宽度
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // 🔧 性能监控Hook
  const measurePerformance = useCallback((renderStartTime: number, rowCount?: number, columnCount?: number) => {
    const renderTime = performance.now() - renderStartTime;
    setState(prev => ({ ...prev, lastRenderTime: renderTime }));
    
    if (onPerformanceMetrics) {
      onPerformanceMetrics({
        renderTime,
        rowCount: rowCount || state.filteredData.length,
        columnCount: columnCount || headers.filter(h => state.visibleColumns.has(h)).length,
        memoryUsage: (performance as any).memory?.usedJSHeapSize
      });
    }
  }, [onPerformanceMetrics, state.filteredData.length, state.visibleColumns, headers]);

  // 🔧 智能搜索过滤（优化大数据集性能）
  const handleSearch = useCallback((searchTerm: string) => {
    const startTime = performance.now();
    
    let filtered = data;
    
    if (searchTerm.trim()) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      
      if (state.performanceMode) {
        // 性能模式：只搜索前几列关键字段
        const keyColumns = headers.slice(0, Math.min(5, headers.length));
        filtered = data.filter(row => 
          keyColumns.some(col => 
            String(row[col] || '').toLowerCase().includes(lowerSearchTerm)
          )
        );
      } else {
        // 标准模式：搜索所有字段
        filtered = data.filter(row => 
          Object.values(row).some(value => 
            String(value).toLowerCase().includes(lowerSearchTerm)
          )
        );
      }
    }
    
    setState(prev => ({
      ...prev,
      filteredData: filtered,
      searchTerm,
      currentPage: 0
    }));
    
    measurePerformance(startTime);
  }, [data, headers, state.performanceMode, measurePerformance]);

  // 🔧 排序功能
  const handleSort = useCallback((column: string) => {
    if (!sortable) return;
    
    const startTime = performance.now();
    
    setState(prev => {
      const direction = prev.sortConfig?.column === column && prev.sortConfig.direction === 'asc' ? 'desc' : 'asc';
      
      const sorted = [...prev.filteredData].sort((a, b) => {
        const aVal = a[column];
        const bVal = b[column];
        
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return direction === 'asc' ? aVal - bVal : bVal - aVal;
        }
        
        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();
        
        if (direction === 'asc') {
          return aStr.localeCompare(bStr);
        } else {
          return bStr.localeCompare(aStr);
        }
      });
      
      setTimeout(() => measurePerformance(startTime), 0);
      
      return {
        ...prev,
        filteredData: sorted,
        sortConfig: { column, direction },
        currentPage: 0
      };
    });
  }, [sortable, measurePerformance]);

  // 🔧 列过滤功能
  const handleColumnFilter = useCallback((column: string, filterValue: string) => {
    const startTime = performance.now();
    
    setState(prev => {
      const newFilters = { ...prev.columnFilters, [column]: filterValue };
      
      let filtered = data;
      
      // 应用搜索
      if (prev.searchTerm) {
        const lowerSearchTerm = prev.searchTerm.toLowerCase();
        filtered = filtered.filter(row => 
          Object.values(row).some(value => 
            String(value).toLowerCase().includes(lowerSearchTerm)
          )
        );
      }
      
      // 应用列过滤
      Object.entries(newFilters).forEach(([col, val]) => {
        if (val.trim()) {
          filtered = filtered.filter(row => 
            String(row[col] || '').toLowerCase().includes(val.toLowerCase())
          );
        }
      });
      
      setTimeout(() => measurePerformance(startTime), 0);
      
      return {
        ...prev,
        columnFilters: newFilters,
        filteredData: filtered,
        currentPage: 0
      };
    });
  }, [data, measurePerformance]);

  // 🔧 导出功能
  const handleExport = useCallback(() => {
    if (onExport) {
      onExport(state.filteredData);
    }
  }, [state.filteredData, onExport]);

  // 🔧 重置所有过滤器
  const handleReset = useCallback(() => {
    setState(prev => ({
      ...prev,
      filteredData: data,
      searchTerm: '',
      columnFilters: {},
      sortConfig: null,
      currentPage: 0
    }));
  }, [data]);

  // 切换列显示
  const toggleColumn = useCallback((columnKey: string) => {
    setState(prev => {
      const newVisibleColumns = new Set(prev.visibleColumns);
      if (newVisibleColumns.has(columnKey)) {
        newVisibleColumns.delete(columnKey);
      } else {
        newVisibleColumns.add(columnKey);
      }
      return {
        ...prev,
        visibleColumns: newVisibleColumns
      };
    });
  }, []);

  // 计算显示的列和数据
  const { displayHeaders, displayData, totalPages } = useMemo(() => {
    const visibleHeaders = headers.filter(h => state.visibleColumns.has(h));
    const startIndex = state.currentPage * pageSize;
    const endIndex = showPagination ? startIndex + pageSize : state.filteredData.length;
    const pageData = state.filteredData.slice(startIndex, endIndex);
    
    return {
      displayHeaders: visibleHeaders,
      displayData: pageData,
      totalPages: showPagination ? Math.ceil(state.filteredData.length / pageSize) : 1
    };
  }, [headers, state.filteredData, state.visibleColumns, state.currentPage, pageSize, showPagination]);

  // 计算列宽度
  const totalColumnsWidth = useMemo(() => {
    return displayHeaders.reduce((sum, header) => sum + state.columnWidths[header], 0);
  }, [displayHeaders, state.columnWidths]);

  // 🔧 增强的表头渲染器
  const HeaderRow = useCallback(() => (
    <div 
      className="flex border-b bg-gray-50 sticky top-0 z-10"
      style={{ width: Math.max(containerWidth, totalColumnsWidth) }}
    >
      {displayHeaders.map((header, index) => (
        <div
          key={header}
          className="flex flex-col border-r bg-gray-50"
          style={{ width: state.columnWidths[header], minWidth: state.columnWidths[header] }}
        >
          {/* 列标题行 */}
          <div className="flex items-center justify-between px-3 py-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span 
                    className={`truncate text-sm font-medium text-gray-900 ${
                      sortable ? 'cursor-pointer hover:text-blue-600' : ''
                    }`}
                    onClick={() => sortable && handleSort(header)}
                  >
                    {header}
                    {state.sortConfig?.column === header && (
                      <span className="ml-1">
                        {state.sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{sortable ? `点击排序 ${header}` : header}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 ml-1"
              onClick={() => toggleColumn(header)}
            >
              <EyeOff className="h-3 w-3" />
            </Button>
          </div>
          
          {/* 列过滤输入框 */}
          {showColumnFilter && (
            <div className="px-2 pb-2">
              <Input
                placeholder="过滤..."
                value={state.columnFilters[header] || ''}
                onChange={(e) => handleColumnFilter(header, e.target.value)}
                className="h-6 text-xs"
              />
            </div>
          )}
        </div>
      ))}
    </div>
  ), [
    displayHeaders, 
    state.columnWidths, 
    state.sortConfig,
    state.columnFilters,
    containerWidth, 
    totalColumnsWidth, 
    sortable,
    showColumnFilter,
    toggleColumn, 
    handleSort,
    handleColumnFilter
  ]);

  // 行渲染器
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const row = displayData[index];
    if (!row) return null;

    return (
      <div 
        style={{
          ...style,
          width: Math.max(containerWidth, totalColumnsWidth)
        }}
        className={`flex border-b hover:bg-gray-50 cursor-pointer ${
          index % 2 === 0 ? 'bg-white' : 'bg-gray-25'
        }`}
        onClick={() => onRowClick?.(row, index)}
      >
        {displayHeaders.map((header) => {
          const value = row[header];
          return (
            <div
              key={header}
              className="flex items-center px-3 py-2 border-r text-sm text-gray-700"
              style={{ width: state.columnWidths[header], minWidth: state.columnWidths[header] }}
              title={String(value)}
            >
              <span className="truncate">
                {renderCell ? renderCell(value, header, index) : String(value || '')}
              </span>
            </div>
          );
        })}
      </div>
    );
  }, [displayData, displayHeaders, state.columnWidths, containerWidth, totalColumnsWidth, onRowClick, renderCell]);

  // 翻页控制
  const handlePageChange = useCallback((newPage: number) => {
    setState(prev => ({
      ...prev,
      currentPage: Math.max(0, Math.min(newPage, totalPages - 1))
    }));
  }, [totalPages]);

  const currentPageData = showPagination 
    ? `第 ${state.currentPage + 1} 页，共 ${totalPages} 页` 
    : `共 ${state.filteredData.length} 条记录`;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">数据预览</CardTitle>
          <div className="flex items-center space-x-2">
            <Badge variant="outline">
              {currentPageData}
            </Badge>
            {state.filteredData.length !== data.length && (
              <Badge variant="secondary">
                已筛选 {state.filteredData.length}/{data.length}
              </Badge>
            )}
          </div>
        </div>

        {/* 🔧 增强的搜索和工具栏 */}
        <div className="flex items-center justify-between mt-3">
          {/* 左侧搜索区域 */}
          {showSearch && (
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={state.performanceMode ? "搜索关键字段..." : "搜索数据..."}
                  value={state.searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              
              {/* 性能模式指示器 */}
              {state.performanceMode && (
                <Badge variant="secondary" className="text-xs">
                  性能模式
                </Badge>
              )}
            </div>
          )}
          
          {/* 右侧工具区域 */}
          <div className="flex items-center space-x-2">
            {/* 过滤器切换 */}
            {showColumnFilter && (
              <Button
                variant="outline"
                size="sm"
                className="h-8"
              >
                <Filter className="h-4 w-4 mr-1" />
                列过滤
              </Button>
            )}
            
            {/* 导出按钮 */}
            {showExport && onExport && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                className="h-8"
              >
                <Download className="h-4 w-4 mr-1" />
                导出
              </Button>
            )}
            
            {/* 重置按钮 */}
            {(state.searchTerm || Object.keys(state.columnFilters).length > 0 || state.sortConfig) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="h-8"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                重置
              </Button>
            )}
          </div>
        </div>
        
        {/* 隐藏的列显示区域 */}
        {headers.length > state.visibleColumns.size && (
          <div className="flex items-center space-x-2 mt-2">
            <span className="text-sm text-gray-600">隐藏的列:</span>
            <div className="flex flex-wrap gap-1">
              {headers.filter(h => !state.visibleColumns.has(h)).map(header => (
                <Button
                  key={header}
                  variant="outline"
                  size="sm"
                  onClick={() => toggleColumn(header)}
                  className="h-6 text-xs px-2"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  {header}
                </Button>
              ))}
            </div>
          </div>
        )}
        
        {/* 性能信息显示 */}
        {state.lastRenderTime > 0 && onPerformanceMetrics && (
          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
            <span>渲染时间: {state.lastRenderTime.toFixed(2)}ms</span>
            {state.lastRenderTime > 100 && (
              <Badge variant="destructive" className="text-xs">
                性能警告
              </Badge>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        <div ref={containerRef} className="border rounded-md">
          {/* 表头 */}
          <HeaderRow />
          
          {/* 虚拟滚动数据区域 */}
          <div style={{ height: maxHeight }}>
            {displayData.length > 0 ? (
              enableVirtualization ? (
                enableVariableHeight ? (
                  <VariableList
                    height={maxHeight}
                    itemCount={displayData.length}
                    estimatedItemSize={rowHeight}
                    width="100%"
                    overscanCount={overscanCount}
                  >
                    {Row}
                  </VariableList>
                ) : (
                  <List
                    height={maxHeight}
                    itemCount={displayData.length}
                    itemSize={rowHeight}
                    width="100%"
                    overscanCount={overscanCount}
                  >
                    {Row}
                  </List>
                )
              ) : (
                <div 
                  className="overflow-auto" 
                  style={{ height: maxHeight }}
                  onScroll={(e) => {
                    // 性能监控：检测滚动性能
                    if (onPerformanceMetrics) {
                      const startTime = performance.now();
                      setTimeout(() => {
                        measurePerformance(startTime, displayData.length, displayHeaders.length);
                      }, 16); // 一帧后测量
                    }
                  }}
                >
                  {displayData.map((row, index) => (
                    <Row 
                      key={index} 
                      index={index} 
                      style={{ height: rowHeight }}
                    />
                  ))}
                </div>
              )
            ) : (
              <div className="flex items-center justify-center h-32 text-gray-500">
                {state.searchTerm ? '未找到匹配的数据' : '暂无数据'}
              </div>
            )}
          </div>
        </div>

        {/* 分页控制 */}
        {showPagination && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                显示 {state.currentPage * pageSize + 1} - {Math.min((state.currentPage + 1) * pageSize, state.filteredData.length)} 条，
                共 {state.filteredData.length} 条记录
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(state.currentPage - 1)}
                disabled={state.currentPage === 0}
              >
                <ChevronLeft className="h-4 w-4" />
                上一页
              </Button>
              
              <span className="text-sm">
                {state.currentPage + 1} / {totalPages}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(state.currentPage + 1)}
                disabled={state.currentPage >= totalPages - 1}
              >
                下一页
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// 专门用于成绩数据的预览组件
export const GradeDataPreview: React.FC<{
  data: any[];
  headers: string[];
  onRowClick?: (row: any, index: number) => void;
  // 🔧 新增高级功能选项
  enableAdvancedFeatures?: boolean;
  onExport?: (data: any[]) => void;
  maxHeight?: number;
}> = ({ 
  data, 
  headers, 
  onRowClick,
  enableAdvancedFeatures = false,
  onExport,
  maxHeight = 300
}) => {
  // 🔧 性能监控回调
  const handlePerformanceMetrics = useCallback((metrics: PerformanceMetrics) => {
    console.log('📊 GradeDataPreview 性能指标:', metrics);
    
    // 如果渲染时间过长，自动启用性能模式
    if (metrics.renderTime > 200) {
      console.warn('⚠️ 成绩预览组件性能警告，建议启用虚拟化');
    }
  }, []);

  // 🔧 增强的自定义渲染器，用于突出显示成绩数据
  const renderCell = useCallback((value: any, columnKey: string, rowIndex: number) => {
    // 如果是分数列，添加颜色标识和等级显示
    if (typeof value === 'number' && (columnKey.includes('分数') || columnKey.includes('score'))) {
      let colorClass = 'text-gray-700';
      let gradeText = '';
      
      if (value >= 95) {
        colorClass = 'text-green-600 font-bold';
        gradeText = ' 优秀';
      } else if (value >= 90) {
        colorClass = 'text-green-600 font-semibold';
        gradeText = ' 良好';
      } else if (value >= 80) {
        colorClass = 'text-blue-600 font-medium';
        gradeText = ' 中等';
      } else if (value >= 60) {
        colorClass = 'text-orange-600';
        gradeText = ' 及格';
      } else if (value < 60) {
        colorClass = 'text-red-600 font-medium';
        gradeText = ' 不及格';
      }
      
      return (
        <div className="flex items-center justify-between">
          <span className={colorClass}>{value}</span>
          {enableAdvancedFeatures && gradeText && (
            <span className={`text-xs ${colorClass} opacity-75`}>
              {gradeText}
            </span>
          )}
        </div>
      );
    }

    // 如果是姓名列，添加特殊样式
    if (columnKey.includes('姓名') || columnKey.includes('name')) {
      return <span className="font-medium text-gray-900">{value}</span>;
    }

    // 如果是班级列，添加标识
    if (columnKey.includes('班级') || columnKey.includes('class')) {
      return <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">{value}</span>;
    }

    // 如果是等级列，添加颜色
    if (columnKey.includes('等级') || columnKey.includes('grade')) {
      let gradeColorClass = 'text-gray-600';
      if (value === 'A' || value === '优秀') gradeColorClass = 'text-green-600 font-semibold';
      else if (value === 'B' || value === '良好') gradeColorClass = 'text-blue-600';
      else if (value === 'C' || value === '中等') gradeColorClass = 'text-orange-600';
      else if (value === 'D' || value === '及格') gradeColorClass = 'text-yellow-600';
      else if (value === 'E' || value === '不及格') gradeColorClass = 'text-red-600';
      
      return <span className={gradeColorClass}>{value}</span>;
    }

    return String(value || '');
  }, [enableAdvancedFeatures]);

  return (
    <VirtualTable
      data={data}
      headers={headers}
      maxHeight={maxHeight}
      rowHeight={enableAdvancedFeatures ? 40 : 35}
      showSearch={true}
      showPagination={data.length > 100}
      pageSize={100}
      onRowClick={onRowClick}
      renderCell={renderCell}
      // 🔧 新增高级功能
      enableVirtualization={data.length > 50}
      enableVariableHeight={enableAdvancedFeatures}
      overscanCount={data.length > 1000 ? 10 : 5}
      showExport={enableAdvancedFeatures}
      onExport={onExport}
      showColumnFilter={enableAdvancedFeatures}
      sortable={enableAdvancedFeatures}
      onPerformanceMetrics={handlePerformanceMetrics}
    />
  );
};