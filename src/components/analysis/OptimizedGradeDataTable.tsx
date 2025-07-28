// 优化后的成绩数据表格组件
// 应用了虚拟化、分页、缓存等多种性能优化策略

import React, { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { FixedSizeList as List } from "react-window";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  Filter,
  RotateCcw,
} from "lucide-react";

// 导入性能优化工具
import {
  DatabaseOptimizer,
  CacheOptimizer,
  useOptimizedQuery,
  useDebounce,
  VirtualizedTableConfig,
  ChartOptimizer,
} from "@/lib/performance-optimizations";

// 类型定义
interface GradeData {
  id: string;
  student_id: string;
  name: string;
  class_name: string;
  subject: string;
  score: number;
  exam_title: string;
  exam_date: string;
  rank_in_class?: number;
  rank_in_grade?: number;
}

interface FilterOptions {
  search: string;
  classFilter: string;
  subjectFilter: string;
  examFilter: string;
  scoreRange: [number, number];
}

interface OptimizedGradeDataTableProps {
  examId?: string;
  className?: string;
  enableVirtualization?: boolean;
  pageSize?: number;
}

// 虚拟化行组件
const VirtualizedRow = React.memo(({ index, style, data }: any) => {
  const { items, columns } = data;
  const item = items[index];

  if (!item) {
    return (
      <div style={style}>
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  return (
    <div
      style={style}
      className="flex border-b border-gray-200 hover:bg-gray-50"
    >
      {columns.map((column: any, colIndex: number) => (
        <div
          key={colIndex}
          className={`flex-1 px-4 py-3 text-sm ${column.className || ""}`}
        >
          {column.render ? column.render(item) : item[column.key]}
        </div>
      ))}
    </div>
  );
});
VirtualizedRow.displayName = "VirtualizedRow";

// 成绩等级获取函数
const getGradeLevel = (score: number): { level: string; color: string } => {
  if (score >= 90)
    return { level: "优秀", color: "bg-green-100 text-green-800" };
  if (score >= 80) return { level: "良好", color: "bg-blue-100 text-blue-800" };
  if (score >= 70)
    return { level: "中等", color: "bg-yellow-100 text-yellow-800" };
  if (score >= 60)
    return { level: "及格", color: "bg-orange-100 text-orange-800" };
  return { level: "不及格", color: "bg-red-100 text-red-800" };
};

// 主组件
export const OptimizedGradeDataTable: React.FC<
  OptimizedGradeDataTableProps
> = ({
  examId,
  className = "",
  enableVirtualization = true,
  pageSize = 50,
}) => {
  // 状态管理
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<FilterOptions>({
    search: "",
    classFilter: "__all_classes__",
    subjectFilter: "__all_subjects__",
    examFilter: examId || "__all_exams__",
    scoreRange: [0, 100],
  });

  // 防抖搜索
  const debouncedSearch = useDebounce(filters.search, 300);

  // 缓存键生成
  const cacheKey = useMemo(
    () =>
      CacheOptimizer.generateKey("grade-data", {
        page: currentPage,
        pageSize,
        search: debouncedSearch,
        classFilter: filters.classFilter,
        subjectFilter: filters.subjectFilter,
        examFilter: filters.examFilter,
      }),
    [currentPage, pageSize, debouncedSearch, filters]
  );

  // 优化的数据查询
  const {
    data: gradeData,
    isLoading,
    error,
    isFetching,
  } = useOptimizedQuery(
    ["grade-data-paginated", cacheKey],
    async () => {
      // 先检查缓存
      const cached = CacheOptimizer.get(cacheKey);
      if (cached) return cached;

      // 使用优化的数据库查询
      const { data, error, count } =
        await DatabaseOptimizer.getGradeDataPaginated(
          currentPage,
          pageSize,
          filters.examFilter && filters.examFilter !== "__all_exams__"
            ? filters.examFilter
            : undefined,
          filters.classFilter && filters.classFilter !== "__all_classes__"
            ? filters.classFilter
            : undefined
        );

      if (error) throw error;

      // 过滤搜索结果
      let filteredData = data || [];
      if (debouncedSearch) {
        filteredData = filteredData.filter(
          (item) =>
            item.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            item.student_id
              ?.toLowerCase()
              .includes(debouncedSearch.toLowerCase())
        );
      }

      // 科目过滤
      if (
        filters.subjectFilter &&
        filters.subjectFilter !== "__all_subjects__"
      ) {
        filteredData = filteredData.filter(
          (item) => item.subject === filters.subjectFilter
        );
      }

      // 分数范围过滤
      filteredData = filteredData.filter((item) => {
        const score = Number(item.score);
        return score >= filters.scoreRange[0] && score <= filters.scoreRange[1];
      });

      const result = {
        data: filteredData,
        total: count || 0,
        page: currentPage,
        pageSize,
      };

      // 缓存结果
      CacheOptimizer.set(cacheKey, result, 2 * 60 * 1000); // 2分钟缓存

      return result;
    },
    {
      enabled: true,
      staleTime: 60 * 1000, // 1分钟
      gcTime: 5 * 60 * 1000, // 5分钟
    }
  );

  // 获取可用的筛选选项
  const { data: filterOptions } = useOptimizedQuery(
    ["filter-options"],
    async () => {
      const cacheKey = "filter-options";
      const cached = CacheOptimizer.get(cacheKey);
      if (cached) return cached;

      // 并行查询所有筛选选项
      const [classesResult, subjectsResult, examsResult] = await Promise.all([
        DatabaseOptimizer.getStudentsOptimized().then((result) => {
          const classes = [
            ...new Set(result.data?.map((s) => s.class_name).filter(Boolean)),
          ];
          return classes;
        }),
        // 简化查询 - 从成绩数据中获取科目
        supabase
          .from("grade_data_new")
          .select("subject")
          .then((result) => {
            const subjects = [
              ...new Set(result.data?.map((g) => g.subject).filter(Boolean)),
            ];
            return subjects;
          }),
        // 获取考试列表
        supabase
          .from("exams")
          .select("id, title")
          .limit(20)
          .then((result) => result.data || []),
      ]);

      const options = {
        classes: classesResult,
        subjects: subjectsResult,
        exams: examsResult,
      };

      CacheOptimizer.set(cacheKey, options, 10 * 60 * 1000); // 10分钟缓存
      return options;
    },
    {
      staleTime: 5 * 60 * 1000, // 5分钟
    }
  );

  // 表格列定义
  const columns = useMemo(
    () => [
      {
        key: "student_id",
        title: "学号",
        className: "min-w-[120px] font-mono text-xs",
        render: (item: GradeData) => (
          <span className="font-mono text-xs">{item.student_id}</span>
        ),
      },
      {
        key: "name",
        title: "姓名",
        className: "min-w-[100px] font-medium",
        render: (item: GradeData) => (
          <span className="font-medium">{item.name}</span>
        ),
      },
      {
        key: "class_name",
        title: "班级",
        className: "min-w-[100px]",
        render: (item: GradeData) => (
          <Badge variant="outline" className="text-xs">
            {item.class_name}
          </Badge>
        ),
      },
      {
        key: "subject",
        title: "科目",
        className: "min-w-[80px]",
        render: (item: GradeData) => (
          <span className="text-sm">{item.subject}</span>
        ),
      },
      {
        key: "score",
        title: "分数",
        className: "min-w-[80px] text-center",
        render: (item: GradeData) => {
          const gradeLevel = getGradeLevel(Number(item.score));
          return (
            <div className="flex flex-col items-center gap-1">
              <span className="font-semibold text-lg">{item.score}</span>
              <Badge className={`text-xs ${gradeLevel.color}`}>
                {gradeLevel.level}
              </Badge>
            </div>
          );
        },
      },
      {
        key: "rank_in_class",
        title: "班级排名",
        className: "min-w-[100px] text-center",
        render: (item: GradeData) => (
          <span className="text-sm">
            {item.rank_in_class ? `第${item.rank_in_class}名` : "-"}
          </span>
        ),
      },
      {
        key: "exam_date",
        title: "考试日期",
        className: "min-w-[120px] text-sm text-gray-600",
        render: (item: GradeData) => (
          <span className="text-sm text-gray-600">
            {item.exam_date
              ? new Date(item.exam_date).toLocaleDateString("zh-CN")
              : "-"}
          </span>
        ),
      },
    ],
    []
  );

  // 事件处理函数
  const handleFilterChange = useCallback(
    (key: keyof FilterOptions, value: any) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
      setCurrentPage(1); // 重置页码
    },
    []
  );

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleReset = useCallback(() => {
    setFilters({
      search: "",
      classFilter: "__all_classes__",
      subjectFilter: "__all_subjects__",
      examFilter: examId || "__all_exams__",
      scoreRange: [0, 100],
    });
    setCurrentPage(1);
  }, [examId]);

  const handleExport = useCallback(async () => {
    try {
      // 导出当前筛选的数据
      const dataToExport = gradeData?.data || [];
      const csvContent = [
        // CSV 头部
        ["学号", "姓名", "班级", "科目", "分数", "班级排名", "考试日期"],
        // 数据行
        ...dataToExport.map((item) => [
          item.student_id,
          item.name,
          item.class_name,
          item.subject,
          item.score,
          item.rank_in_class || "",
          item.exam_date
            ? new Date(item.exam_date).toLocaleDateString("zh-CN")
            : "",
        ]),
      ]
        .map((row) => row.join(","))
        .join("\n");

      const blob = new Blob(["\uFEFF" + csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `成绩数据_${new Date().toLocaleDateString("zh-CN")}.csv`;
      link.click();
    } catch (error) {
      console.error("导出失败:", error);
    }
  }, [gradeData?.data]);

  // 计算分页信息
  const totalPages = Math.ceil((gradeData?.total || 0) / pageSize);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  // 渲染加载状态
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // 渲染错误状态
  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-8">
          <div className="text-center">
            <p className="text-red-600 mb-4">
              数据加载失败: {(error as Error).message}
            </p>
            <Button onClick={() => window.location.reload()}>重试</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const items = gradeData?.data || [];

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            成绩数据表
            {isFetching && (
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={items.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              导出CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-2" />
              重置
            </Button>
          </div>
        </div>

        {/* 筛选器 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              placeholder="搜索学号或姓名..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="pl-10"
            />
          </div>

          <Select
            value={filters.classFilter}
            onValueChange={(value) => handleFilterChange("classFilter", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择班级" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all_classes__">所有班级</SelectItem>
              {filterOptions?.classes?.map((cls) => (
                <SelectItem key={cls} value={cls}>
                  {cls}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.subjectFilter}
            onValueChange={(value) =>
              handleFilterChange("subjectFilter", value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="选择科目" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all_subjects__">所有科目</SelectItem>
              {filterOptions?.subjects?.map((subject) => (
                <SelectItem key={subject} value={subject}>
                  {subject}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.examFilter}
            onValueChange={(value) => handleFilterChange("examFilter", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择考试" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all_exams__">所有考试</SelectItem>
              {filterOptions?.exams?.map((exam) => (
                <SelectItem key={exam.id} value={exam.id}>
                  {exam.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {/* 数据统计 */}
        <div className="flex items-center justify-between mb-4 p-4 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600">
            共{" "}
            <span className="font-semibold text-gray-900">
              {gradeData?.total || 0}
            </span>{" "}
            条记录， 当前显示第{" "}
            <span className="font-semibold text-gray-900">{currentPage}</span>{" "}
            页， 共{" "}
            <span className="font-semibold text-gray-900">{totalPages}</span> 页
          </div>
          <div className="text-sm text-gray-600">
            本页显示{" "}
            <span className="font-semibold text-gray-900">{items.length}</span>{" "}
            条
          </div>
        </div>

        {/* 表格内容 */}
        {items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">暂无数据</p>
            <Button variant="outline" onClick={handleReset}>
              <Filter className="w-4 h-4 mr-2" />
              清除筛选条件
            </Button>
          </div>
        ) : (
          <>
            {enableVirtualization && items.length > 20 ? (
              // 虚拟化表格（大数据量时使用）
              <div className="border rounded-lg overflow-hidden">
                {/* 表头 */}
                <div className="flex bg-gray-50 border-b">
                  {columns.map((column, index) => (
                    <div
                      key={index}
                      className={`flex-1 px-4 py-3 text-sm font-medium text-gray-900 ${column.className || ""}`}
                    >
                      {column.title}
                    </div>
                  ))}
                </div>

                {/* 虚拟化列表 */}
                <List
                  height={400}
                  itemCount={items.length}
                  itemSize={VirtualizedTableConfig.itemHeight}
                  itemData={{ items, columns }}
                  overscanCount={VirtualizedTableConfig.overscan}
                >
                  {VirtualizedRow}
                </List>
              </div>
            ) : (
              // 常规表格（小数据量时使用）
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {columns.map((column, index) => (
                        <TableHead key={index} className={column.className}>
                          {column.title}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id} className="hover:bg-gray-50">
                        {columns.map((column, index) => (
                          <TableCell key={index} className={column.className}>
                            {column.render
                              ? column.render(item)
                              : item[column.key]}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}

        {/* 分页控件 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={!hasPrevPage}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              上一页
            </Button>

            <div className="flex items-center gap-2">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = Math.max(1, currentPage - 2) + i;
                if (pageNum > totalPages) return null;

                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(pageNum)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={!hasNextPage}
            >
              下一页
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OptimizedGradeDataTable;

// 添加必要的导入
import { supabase } from "@/integrations/supabase/client";
