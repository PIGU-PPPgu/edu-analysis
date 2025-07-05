import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  Download,
  Search,
  MoreHorizontal,
  Trash2,
  Edit,
  Eye,
  ChevronDown,
  X,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Positivus设计标准颜色
const POSITIVUS_COLORS = {
  primary: '#B9FF66',
  secondary: '#191A23',
  accent: '#F7931E',
  danger: '#FF6B6B',
  white: '#FFFFFF',
};

interface Column<T> {
  id: string;
  header: string;
  accessorKey: keyof T;
  cell?: (item: T) => React.ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  width?: number;
  className?: string;
}

interface EnhancedDataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  pageSize?: number;
  virtualScrolling?: boolean;
  searchable?: boolean;
  filterable?: boolean;
  batchActions?: boolean;
  exportable?: boolean;
  onRowClick?: (item: T) => void;
  onBatchAction?: (action: string, selectedItems: T[]) => void;
  onExport?: (data: T[]) => void;
  className?: string;
  loading?: boolean;
  emptyState?: React.ReactNode;
}

type SortDirection = 'asc' | 'desc' | null;

interface SortState {
  column: string | null;
  direction: SortDirection;
}

export function EnhancedDataTable<T extends { id: string | number }>({
  data,
  columns,
  pageSize = 50,
  virtualScrolling = false,
  searchable = true,
  filterable = true,
  batchActions = true,
  exportable = true,
  onRowClick,
  onBatchAction,
  onExport,
  className,
  loading = false,
  emptyState,
}: EnhancedDataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortState, setSortState] = useState<SortState>({ column: null, direction: null });
  const [selectedItems, setSelectedItems] = useState<Set<string | number>>(new Set());
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const listRef = useRef<any>(null);

  // 处理搜索和筛选
  const filteredData = useMemo(() => {
    let filtered = [...data];

    // 全局搜索
    if (searchQuery) {
      filtered = filtered.filter(item =>
        columns.some(column => {
          const value = item[column.accessorKey];
          return String(value).toLowerCase().includes(searchQuery.toLowerCase());
        })
      );
    }

    // 列筛选
    Object.entries(columnFilters).forEach(([columnId, filterValue]) => {
      if (filterValue) {
        const column = columns.find(col => col.id === columnId);
        if (column) {
          filtered = filtered.filter(item => {
            const value = item[column.accessorKey];
            return String(value).toLowerCase().includes(filterValue.toLowerCase());
          });
        }
      }
    });

    return filtered;
  }, [data, searchQuery, columnFilters, columns]);

  // 处理排序
  const sortedData = useMemo(() => {
    if (!sortState.column || !sortState.direction) return filteredData;

    const column = columns.find(col => col.id === sortState.column);
    if (!column) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[column.accessorKey];
      const bValue = b[column.accessorKey];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortState.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortState.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      return sortState.direction === 'asc'
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    });
  }, [filteredData, sortState, columns]);

  // 分页数据
  const paginatedData = useMemo(() => {
    if (virtualScrolling) return sortedData;
    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPage, pageSize, virtualScrolling]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  // 排序处理
  const handleSort = useCallback((columnId: string) => {
    setSortState(prev => {
      if (prev.column !== columnId) {
        return { column: columnId, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { column: columnId, direction: 'desc' };
      }
      return { column: null, direction: null };
    });
  }, []);

  // 选择处理
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(paginatedData.map(item => item.id)));
    } else {
      setSelectedItems(new Set());
    }
  }, [paginatedData]);

  const handleSelectItem = useCallback((itemId: string | number, checked: boolean) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(itemId);
      } else {
        newSet.delete(itemId);
      }
      return newSet;
    });
  }, []);

  // 批量操作
  const handleBatchAction = useCallback((action: string) => {
    const selectedData = data.filter(item => selectedItems.has(item.id));
    onBatchAction?.(action, selectedData);
    setSelectedItems(new Set());
  }, [data, selectedItems, onBatchAction]);

  // 导出数据
  const handleExport = useCallback(() => {
    onExport?.(sortedData);
  }, [sortedData, onExport]);

  // 清除筛选
  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setColumnFilters({});
    setSortState({ column: null, direction: null });
  }, []);

  // 虚拟滚动行渲染
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = sortedData[index];
    const isSelected = selectedItems.has(item.id);

    return (
      <div style={style} className="flex items-center border-b border-gray-200 hover:bg-gray-50">
        {batchActions && (
          <div className="w-12 flex items-center justify-center">
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
            />
          </div>
        )}
        {columns.map((column) => (
          <div
            key={column.id}
            className={cn(
              'px-4 py-3 text-sm',
              column.className,
              !column.width && 'flex-1'
            )}
            style={{ width: column.width }}
          >
            {column.cell ? column.cell(item) : String(item[column.accessorKey])}
          </div>
        ))}
      </div>
    );
  };

  // 加载状态
  if (loading) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_#B9FF66]">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-[#191A23]" />
          <span className="text-lg font-bold text-[#191A23]">加载中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* 工具栏 */}
      <div className="flex flex-col sm:flex-row gap-4 p-4 bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_#B9FF66]">
        {/* 搜索和筛选 */}
        <div className="flex-1 flex flex-col sm:flex-row gap-3">
          {searchable && (
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                placeholder="搜索数据..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-2 border-black rounded-lg font-medium focus:border-[#B9FF66] focus:ring-2 focus:ring-[#B9FF66]/20"
              />
            </div>
          )}

          {filterable && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="border-2 border-black rounded-lg font-bold hover:bg-[#B9FF66] hover:text-black shadow-[2px_2px_0px_0px_#191A23]"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  筛选
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 border-2 border-black rounded-lg bg-white shadow-[4px_4px_0px_0px_#191A23]">
                <DropdownMenuLabel className="font-bold text-[#191A23]">列筛选</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {columns.filter(col => col.filterable).map((column) => (
                  <div key={column.id} className="p-2">
                    <label className="text-sm font-medium text-[#191A23] mb-1 block">
                      {column.header}
                    </label>
                    <Input
                      placeholder={`筛选${column.header}...`}
                      value={columnFilters[column.id] || ''}
                      onChange={(e) => 
                        setColumnFilters(prev => ({
                          ...prev,
                          [column.id]: e.target.value
                        }))
                      }
                      className="border border-gray-300 rounded text-sm"
                    />
                  </div>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={clearFilters}
                  className="text-red-600 font-medium"
                >
                  <X className="w-4 h-4 mr-2" />
                  清除所有筛选
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2">
          {/* 批量操作 */}
          {batchActions && selectedItems.size > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="border-2 border-black rounded-lg font-bold bg-[#F7931E] text-white hover:bg-[#E8821C] shadow-[2px_2px_0px_0px_#191A23]"
                >
                  批量操作 ({selectedItems.size})
                  <ChevronDown className="w-4 h-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="border-2 border-black rounded-lg bg-white shadow-[4px_4px_0px_0px_#191A23]">
                <DropdownMenuItem onClick={() => handleBatchAction('edit')}>
                  <Edit className="w-4 h-4 mr-2" />
                  批量编辑
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBatchAction('delete')}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  批量删除
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBatchAction('export')}>
                  <Download className="w-4 h-4 mr-2" />
                  导出选中
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* 导出按钮 */}
          {exportable && (
            <Button
              onClick={handleExport}
              className="border-2 border-black rounded-lg font-bold bg-[#B9FF66] text-black hover:bg-[#A8E055] shadow-[2px_2px_0px_0px_#191A23] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_#191A23]"
            >
              <Download className="w-4 h-4 mr-2" />
              导出数据
            </Button>
          )}
        </div>
      </div>

      {/* 表格 */}
      <div className="bg-white border-2 border-black rounded-xl shadow-[6px_6px_0px_0px_#191A23] overflow-hidden">
        {/* 表头 */}
        <div className="bg-[#B9FF66] border-b-2 border-black">
          <div className="flex items-center">
            {batchActions && (
              <div className="w-12 flex items-center justify-center p-3">
                <Checkbox
                  checked={selectedItems.size === paginatedData.length && paginatedData.length > 0}
                  indeterminate={selectedItems.size > 0 && selectedItems.size < paginatedData.length}
                  onCheckedChange={handleSelectAll}
                />
              </div>
            )}
            {columns.map((column) => (
              <div
                key={column.id}
                className={cn(
                  'px-4 py-3 text-sm font-bold text-[#191A23] border-r border-black last:border-r-0',
                  column.sortable && 'cursor-pointer hover:bg-[#A8E055] transition-colors',
                  column.className,
                  !column.width && 'flex-1'
                )}
                style={{ width: column.width }}
                onClick={() => column.sortable && handleSort(column.id)}
              >
                <div className="flex items-center gap-2">
                  <span className="uppercase tracking-wide">{column.header}</span>
                  {column.sortable && (
                    <div className="flex flex-col">
                      {sortState.column === column.id ? (
                        sortState.direction === 'asc' ? (
                          <ArrowUp className="w-4 h-4" />
                        ) : (
                          <ArrowDown className="w-4 h-4" />
                        )
                      ) : (
                        <ArrowUpDown className="w-4 h-4 opacity-50" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 表格内容 */}
        <div className="relative">
          {sortedData.length === 0 ? (
            <div className="h-64 flex items-center justify-center">
              {emptyState || (
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                    <Search className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-lg font-bold text-gray-600">暂无数据</p>
                  <p className="text-sm text-gray-500">没有找到匹配的记录</p>
                </div>
              )}
            </div>
          ) : virtualScrolling ? (
            <List
              ref={listRef}
              height={400}
              itemCount={sortedData.length}
              itemSize={48}
              itemData={sortedData}
            >
              {Row}
            </List>
          ) : (
            <div className="divide-y divide-gray-200">
              {paginatedData.map((item, index) => (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-center hover:bg-gray-50 transition-colors',
                    onRowClick && 'cursor-pointer',
                    selectedItems.has(item.id) && 'bg-[#B9FF66]/10'
                  )}
                  onClick={() => onRowClick?.(item)}
                >
                  {batchActions && (
                    <div className="w-12 flex items-center justify-center">
                      <Checkbox
                        checked={selectedItems.has(item.id)}
                        onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  )}
                  {columns.map((column) => (
                    <div
                      key={column.id}
                      className={cn(
                        'px-4 py-3 text-sm border-r border-gray-200 last:border-r-0',
                        column.className,
                        !column.width && 'flex-1'
                      )}
                      style={{ width: column.width }}
                    >
                      {column.cell ? column.cell(item) : String(item[column.accessorKey])}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 分页 */}
        {!virtualScrolling && totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t-2 border-black bg-gray-50">
            <div className="text-sm text-gray-600 font-medium">
              显示 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, sortedData.length)} 
              / 共 {sortedData.length} 条记录
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="border-2 border-black rounded font-bold"
              >
                上一页
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className={cn(
                        "border-2 border-black rounded font-bold w-8 h-8 p-0",
                        currentPage === page && "bg-[#B9FF66] text-black"
                      )}
                    >
                      {page}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="border-2 border-black rounded font-bold"
              >
                下一页
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 状态栏 */}
      <div className="flex items-center justify-between text-sm text-gray-600 bg-white p-3 border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_#191A23]">
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="border-black font-bold">
            总计: {data.length} 条
          </Badge>
          <Badge variant="outline" className="border-black font-bold">
            显示: {sortedData.length} 条
          </Badge>
          {selectedItems.size > 0 && (
            <Badge className="bg-[#F7931E] text-white border-black font-bold">
              已选择: {selectedItems.size} 条
            </Badge>
          )}
        </div>
        <div className="text-xs text-gray-500">
          上次更新: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
} 