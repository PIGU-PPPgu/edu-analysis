import React, { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
} from "lucide-react";

interface Column {
  key: string;
  header: string;
  width?: string;
  render?: (value: any, row: any, index: number) => React.ReactNode;
}

interface PaginatedTableProps {
  data: any[];
  columns: Column[];
  pageSize?: number;
  className?: string;
  maxHeight?: string;
}

const PaginatedTable: React.FC<PaginatedTableProps> = ({
  data,
  columns,
  pageSize = 20,
  className = "",
  maxHeight = "60vh",
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(pageSize);

  // 计算分页数据
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  }, [data, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(data.length / itemsPerPage);

  // 分页控制函数
  const goToFirstPage = () => setCurrentPage(1);
  const goToPreviousPage = () => setCurrentPage(Math.max(1, currentPage - 1));
  const goToNextPage = () =>
    setCurrentPage(Math.min(totalPages, currentPage + 1));
  const goToLastPage = () => setCurrentPage(totalPages);

  // 处理每页显示数量变化
  const handleItemsPerPageChange = (value: string) => {
    const newItemsPerPage = parseInt(value);
    setItemsPerPage(newItemsPerPage);
    // 调整当前页码，确保不超出范围
    const newTotalPages = Math.ceil(data.length / newItemsPerPage);
    if (currentPage > newTotalPages) {
      setCurrentPage(newTotalPages || 1);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 数据表格 */}
      <ScrollArea
        className="border rounded-md bg-white"
        style={{ height: maxHeight }}
      >
        <div className="overflow-x-auto">
          <Table className="min-w-full divide-y divide-gray-200">
            <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
              <TableRow>
                {columns.map((column) => (
                  <TableHead
                    key={column.key}
                    className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                    style={{ width: column.width }}
                  >
                    {column.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody className="bg-white divide-y divide-gray-200">
              {paginatedData.map((row, rowIndex) => (
                <TableRow key={rowIndex} className="hover:bg-gray-50">
                  {columns.map((column) => (
                    <TableCell
                      key={`${rowIndex}-${column.key}`}
                      className="px-3 py-2 text-xs text-gray-700 whitespace-nowrap"
                    >
                      {column.render
                        ? column.render(row[column.key], row, rowIndex)
                        : String(
                            row[column.key] !== undefined &&
                              row[column.key] !== null
                              ? row[column.key]
                              : ""
                          )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {paginatedData.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="px-3 py-8 text-center text-gray-500"
                  >
                    暂无数据
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </ScrollArea>

      {/* 分页控制栏 */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-700">
            显示第{" "}
            {data.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} 到{" "}
            {Math.min(currentPage * itemsPerPage, data.length)} 条，共{" "}
            {data.length} 条记录
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* 每页显示数量选择 */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">每页显示:</span>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={handleItemsPerPageChange}
            >
              <SelectTrigger className="w-20 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 分页按钮 */}
          <div className="flex items-center space-x-1">
            <Button
              variant="outline"
              size="sm"
              onClick={goToFirstPage}
              disabled={currentPage === 1}
              className="h-8 w-8 p-0"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <span className="text-sm text-gray-700 px-2">
              第 {currentPage} 页，共 {totalPages} 页
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToLastPage}
              disabled={currentPage === totalPages}
              className="h-8 w-8 p-0"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaginatedTable;
