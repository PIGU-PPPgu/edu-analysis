/**
 * 优化的成绩数据表格组件
 * 使用虚拟化技术处理大数据集
 */

import React, {
  useMemo,
  useCallback,
  useState,
  useRef,
  useEffect,
  memo,
} from "react";
import { VariableSizeList as List } from "react-window";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Filter,
  Download,
  ChevronUp,
  ChevronDown,
  MoreVertical,
  Eye,
  FileText,
  Loader2,
} from "lucide-react";
import { GradeData } from "@/types/grade";
import { useOptimizedGradeData } from "@/hooks/useOptimizedGradeData";
import { usePerformanceOptimizer } from "@/services/performance/advancedAnalysisOptimizer";
import { cn } from "@/lib/utils";

interface OptimizedGradeDataTableProps {
  examId?: string;
  enableVirtualization?: boolean;
  pageSize?: number;
  onRowClick?: (row: GradeData) => void;
  onExport?: (data: GradeData[]) => void;
}

// 表格列配置
interface TableColumn {
  key: keyof GradeData;
  label: string;
  width: number;
  sortable?: boolean;
  render?: (value: any, row: GradeData) => React.ReactNode;
}

const columns: TableColumn[] = [
  { key: "student_id", label: "学号", width: 100, sortable: true },
  { key: "name", label: "姓名", width: 100, sortable: true },
  { key: "class_name", label: "班级", width: 120, sortable: true },
  { key: "total_score", label: "总分", width: 80, sortable: true },
  { key: "total_rank_in_class", label: "班级排名", width: 100, sortable: true },
  { key: "total_rank_in_grade", label: "年级排名", width: 100, sortable: true },
  { key: "chinese_score", label: "语文", width: 80, sortable: true },
  { key: "math_score", label: "数学", width: 80, sortable: true },
  { key: "english_score", label: "英语", width: 80, sortable: true },
];

// 优化的虚拟化行组件 - 修复10+秒渲染问题
const VirtualRow = memo<{
  index: number;
  style: React.CSSProperties;
  data: {
    items: GradeData[];
    columns: TableColumn[];
    onRowClick?: (row: GradeData) => void;
    selectedRows: Set<string>;
    onSelectRow: (id: string, selected: boolean) => void;
  };
}>(({ index, style, data }) => {
  // 🎯 性能监控：仅在开发环境启用
  const startTime =
    process.env.NODE_ENV === "development" ? performance.now() : 0;

  const { items, columns, onRowClick, selectedRows, onSelectRow } = data;
  const row = items[index];

  if (!row) {
    return <div style={style} className="h-12" />;
  }

  const isSelected = selectedRows.has(row.id);

  // 🎯 性能优化：预计算值，避免重复计算
  const rowClassName = `flex items-center border-b hover:bg-gray-50 cursor-pointer ${isSelected ? "bg-blue-50" : ""}`;

  // 🎯 性能优化：缓存回调函数
  const handleRowClick = useCallback(() => {
    onRowClick?.(row);
  }, [onRowClick, row.id]);

  const handleCheckboxChange = useCallback(
    (checked: boolean) => {
      onSelectRow(row.id, checked);
    },
    [onSelectRow, row.id]
  );

  const handleCheckboxClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <div style={style} className={rowClassName} onClick={handleRowClick}>
      <div className="w-12 flex items-center justify-center">
        <Checkbox
          checked={isSelected}
          onCheckedChange={handleCheckboxChange}
          onClick={handleCheckboxClick}
        />
      </div>
      {columns.map((column) => {
        // 🎯 性能优化：简化渲染逻辑
        const value = row[column.key];
        const displayValue = column.render ? column.render(value, row) : value;

        return (
          <div
            key={column.key}
            className="px-3 py-2 truncate text-sm"
            style={{ width: column.width }}
          >
            {displayValue}
          </div>
        );
      })}
      <div className="w-12 flex items-center justify-center">
        {/* 🎯 性能优化：简化操作按钮，减少复杂组件 */}
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            // 简化为直接操作，移除复杂的DropdownMenu
            console.log("Row action:", row.id);
          }}
          className="h-6 w-6"
        >
          <MoreVertical className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );

  // 🎯 性能监控：记录渲染时间
  if (process.env.NODE_ENV === "development" && startTime > 0) {
    const renderTime = performance.now() - startTime;
    if (renderTime > 50) {
      // 只记录超过50ms的渲染
      console.warn(
        `🎯 VirtualRow-${index} 渲染耗时: ${renderTime.toFixed(2)}ms`
      );
    }
  }
});

VirtualRow.displayName = "VirtualRow";

// 主表格组件
const OptimizedGradeDataTable: React.FC<OptimizedGradeDataTableProps> = ({
  examId,
  enableVirtualization = true,
  pageSize = 50,
  onRowClick,
  onExport,
}) => {
  const optimizer = usePerformanceOptimizer();
  const listRef = useRef<List>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<keyof GradeData>("total_score");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [filterValue, setFilterValue] = useState("");

  const {
    data,
    total,
    isLoading,
    error,
    refetch,
    filter,
    setFilter,
    searchTerm,
    setSearchTerm,
    currentPage,
    setCurrentPage,
    hasNextPage,
    fetchNextPage,
  } = useOptimizedGradeData({
    examId,
    pageSize,
    enableRealTimeRefresh: false,
  });

  // 🎯 性能优化：延迟搜索术语
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 🎯 性能优化：排序和过滤数据
  const processedData = useMemo(() => {
    console.time("processedData");
    let result = [...data];

    // 🎯 搜索过滤 - 使用防抖的搜索术语
    if (debouncedSearchTerm) {
      const term = debouncedSearchTerm.toLowerCase();
      result = result.filter((row) => {
        const name = row.name?.toLowerCase() || "";
        const studentId = row.student_id?.toLowerCase() || "";
        const className = row.class_name?.toLowerCase() || "";
        return (
          name.includes(term) ||
          studentId.includes(term) ||
          className.includes(term)
        );
      });
    }

    // 🎯 排序 - 简化排序逻辑
    if (result.length > 0) {
      result.sort((a, b) => {
        const aVal = a[sortColumn] ?? 0;
        const bVal = b[sortColumn] ?? 0;

        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
        }

        const aStr = String(aVal);
        const bStr = String(bVal);
        return sortDirection === "asc"
          ? aStr.localeCompare(bStr)
          : bStr.localeCompare(aStr);
      });
    }

    console.timeEnd("processedData");
    return result;
  }, [data, debouncedSearchTerm, sortColumn, sortDirection]);

  // 🎯 性能优化：虚拟化相关
  const getItemSize = useCallback(() => 48, []); // 固定行高

  // 🎯 性能优化：缓存选择行回调
  const handleSelectRow = useCallback((id: string, selected: boolean) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  // 🎯 性能优化：稳定的itemData对象，减少重渲染
  const itemData = useMemo(
    () => ({
      items: processedData,
      columns,
      onRowClick,
      selectedRows,
      onSelectRow: handleSelectRow,
    }),
    [processedData, onRowClick, selectedRows, handleSelectRow]
  );

  // 处理排序
  const handleSort = useCallback(
    (column: keyof GradeData) => {
      if (sortColumn === column) {
        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortColumn(column);
        setSortDirection("desc");
      }
    },
    [sortColumn]
  );

  // 导出数据
  const handleExport = useCallback(() => {
    const exportData =
      selectedRows.size > 0
        ? processedData.filter((row) => selectedRows.has(row.id))
        : processedData;

    if (onExport) {
      onExport(exportData);
    } else {
      // 默认导出为CSV
      const csv = [
        columns.map((col) => col.label).join(","),
        ...exportData.map((row) =>
          columns.map((col) => row[col.key] ?? "").join(",")
        ),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `grade-data-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [processedData, selectedRows, onExport]);

  // 全选/取消全选
  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedRows(new Set(processedData.map((row) => row.id)));
      } else {
        setSelectedRows(new Set());
      }
    },
    [processedData]
  );

  // 无限滚动加载
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;

      if (
        scrollHeight - scrollTop <= clientHeight * 1.5 &&
        hasNextPage &&
        !isLoading
      ) {
        fetchNextPage();
      }
    },
    [hasNextPage, isLoading, fetchNextPage]
  );

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-500 mb-2">加载失败</p>
            <Button onClick={() => refetch()} size="sm">
              重试
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            成绩数据
            <Badge variant="secondary">{total} 条</Badge>
            {selectedRows.size > 0 && (
              <Badge variant="default">{selectedRows.size} 已选</Badge>
            )}
          </CardTitle>

          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索学生..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>筛选条件</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Select
                    value={filter.class || ""}
                    onValueChange={(value) =>
                      setFilter({ ...filter, class: value })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="选择班级" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">全部班级</SelectItem>
                      {/* 动态加载班级列表 */}
                    </SelectContent>
                  </Select>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              size="icon"
              onClick={handleExport}
              disabled={processedData.length === 0}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading && processedData.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="relative">
            {/* 表头 */}
            <div className="flex items-center border-b bg-gray-50 sticky top-0 z-10">
              <div className="w-12 flex items-center justify-center">
                <Checkbox
                  checked={
                    selectedRows.size === processedData.length &&
                    processedData.length > 0
                  }
                  indeterminate={
                    selectedRows.size > 0 &&
                    selectedRows.size < processedData.length
                  }
                  onCheckedChange={handleSelectAll}
                />
              </div>
              {columns.map((column) => (
                <div
                  key={column.key}
                  className={cn(
                    "px-3 py-2 font-medium text-sm",
                    column.sortable && "cursor-pointer hover:bg-gray-100"
                  )}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-1">
                    {column.label}
                    {column.sortable &&
                      sortColumn === column.key &&
                      (sortDirection === "asc" ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      ))}
                  </div>
                </div>
              ))}
              <div className="w-12" />
            </div>

            {/* 🎯 性能优化：表格内容 */}
            {enableVirtualization && processedData.length > 50 ? (
              <List
                ref={listRef}
                height={600}
                itemCount={processedData.length}
                itemSize={getItemSize}
                itemData={itemData}
                onScroll={handleScroll}
                className="scrollbar-thin"
                overscanCount={10} // 预渲染行数减少
                useIsScrolling={false} // 禁用滚动状态追踪
              >
                {VirtualRow}
              </List>
            ) : (
              <div
                className="max-h-[600px] overflow-auto"
                onScroll={handleScroll}
              >
                {processedData.map((row, index) => (
                  <VirtualRow
                    key={row.id}
                    index={index}
                    style={{ height: 48 }}
                    data={itemData}
                  />
                ))}
              </div>
            )}

            {/* 加载更多 */}
            {hasNextPage && (
              <div className="flex items-center justify-center p-4 border-t">
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                ) : (
                  <Button variant="ghost" onClick={() => fetchNextPage()}>
                    加载更多
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default memo(OptimizedGradeDataTable);
