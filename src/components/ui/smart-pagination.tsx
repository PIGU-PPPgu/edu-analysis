/**
 * 智能分页组件
 * 支持大数据集的高性能分页显示
 */
import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Filter,
} from "lucide-react";

interface SmartPaginationProps<T> {
  data: T[];
  itemsPerPage?: number;
  searchFields?: (keyof T)[];
  onDataChange?: (
    paginatedData: T[],
    currentPage: number,
    totalPages: number
  ) => void;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  showSearch?: boolean;
  showPageSizeSelector?: boolean;
  pageSizeOptions?: number[];
}

export function SmartPagination<T extends Record<string, any>>({
  data,
  itemsPerPage = 20,
  searchFields = [],
  onDataChange,
  renderItem,
  className = "",
  showSearch = true,
  showPageSizeSelector = true,
  pageSizeOptions = [10, 20, 50, 100],
}: SmartPaginationProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(itemsPerPage);
  const [searchTerm, setSearchTerm] = useState("");
  const [jumpPage, setJumpPage] = useState("");

  // 过滤数据
  const filteredData = useMemo(() => {
    if (!searchTerm || searchFields.length === 0) return data;

    return data.filter((item) =>
      searchFields.some((field) => {
        const value = item[field];
        if (typeof value === "string") {
          return value.toLowerCase().includes(searchTerm.toLowerCase());
        }
        if (typeof value === "number") {
          return value.toString().includes(searchTerm);
        }
        return false;
      })
    );
  }, [data, searchTerm, searchFields]);

  // 计算分页信息
  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const currentData = filteredData.slice(startIndex, endIndex);

  // 重置到第一页当搜索条件改变时
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize]);

  // 数据变化时调用回调
  useEffect(() => {
    onDataChange?.(currentData, currentPage, totalPages);
  }, [currentData, currentPage, totalPages, onDataChange]);

  // 页码跳转
  const handleJumpToPage = () => {
    const page = parseInt(jumpPage);
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setJumpPage("");
    }
  };

  // 生成页码数组（智能显示）
  const getPageNumbers = () => {
    const delta = 2; // 当前页前后显示的页数
    const pages: (number | string)[] = [];

    if (totalPages <= 7) {
      // 页数较少时显示所有页码
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 页数较多时智能显示
      if (currentPage <= delta + 1) {
        // 当前页靠近开始
        for (let i = 1; i <= delta + 2; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - delta) {
        // 当前页靠近结束
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - delta - 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // 当前页在中间
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - delta; i <= currentPage + delta; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  if (totalItems === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        暂无数据
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 搜索和筛选栏 */}
      {showSearch && searchFields.length > 0 && (
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 flex-1">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder={`搜索 ${searchFields.map((field) => String(field)).join(", ")}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
          {searchTerm && (
            <div className="text-sm text-gray-600">
              找到 {totalItems} 条结果
            </div>
          )}
        </div>
      )}

      {/* 数据项渲染 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {currentData.map((item, index) => (
          <div key={startIndex + index}>
            {renderItem(item, startIndex + index)}
          </div>
        ))}
      </div>

      {/* 分页控制栏 */}
      <div className="flex items-center justify-between p-4 bg-white border rounded-lg">
        {/* 左侧：数据统计和页大小选择 */}
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            显示 {startIndex + 1}-{endIndex} 条，共 {totalItems} 条
          </div>

          {showPageSizeSelector && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">每页显示</span>
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => setPageSize(parseInt(value))}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map((size) => (
                    <SelectItem key={size} value={size.toString()}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-gray-600">条</span>
            </div>
          )}
        </div>

        {/* 右侧：分页控制 */}
        <div className="flex items-center gap-2">
          {/* 跳转到首页 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>

          {/* 上一页 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* 页码按钮 */}
          <div className="flex items-center gap-1">
            {getPageNumbers().map((page, index) => (
              <React.Fragment key={index}>
                {page === "..." ? (
                  <span className="px-2 py-1 text-gray-400">...</span>
                ) : (
                  <Button
                    variant={page === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page as number)}
                    className="min-w-[32px]"
                  >
                    {page}
                  </Button>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* 下一页 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setCurrentPage(Math.min(totalPages, currentPage + 1))
            }
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* 跳转到末页 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>

          {/* 页码跳转 */}
          <div className="flex items-center gap-2 ml-4">
            <span className="text-sm text-gray-600">跳转到</span>
            <Input
              type="number"
              min="1"
              max={totalPages}
              value={jumpPage}
              onChange={(e) => setJumpPage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleJumpToPage()}
              className="w-16 text-center"
              placeholder="页"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleJumpToPage}
              disabled={!jumpPage}
            >
              跳转
            </Button>
          </div>
        </div>
      </div>

      {/* 性能信息（开发模式显示） */}
      {process.env.NODE_ENV === "development" && (
        <div className="text-xs text-gray-400 text-center">
          分页性能：渲染 {currentData.length} 项，总计 {totalItems} 项数据
        </div>
      )}
    </div>
  );
}
