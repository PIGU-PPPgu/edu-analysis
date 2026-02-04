/**
 * 简化版成绩数据表格组件 - Positivus风格
 * 保留核心功能，应用Positivus设计风格
 */

import React, { useState, useMemo, useCallback } from "react";
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
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  Filter,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useModernGradeAnalysis } from "@/contexts/ModernGradeAnalysisContext";

// 类型定义
interface FilterOptions {
  search: string;
  classFilter: string;
  subjectFilter: string;
  scoreRange: [number, number];
}

interface SimpleGradeDataTableProps {
  className?: string;
  pageSize?: number;
}

interface WideSubjectData {
  score?: number;
  grade?: string;
  rank?: number;
}

interface WideStudentRecord {
  student_id: string;
  name?: string;
  class_name?: string;
  exam_date?: string;
  subjects: Record<string, WideSubjectData>;
}

interface LongGradeRecord {
  id?: string;
  student_id: string;
  name?: string;
  class_name?: string;
  subject?: string;
  score?: number;
  total_score?: number;
  grade?: string;
  rank_in_class?: number;
  exam_date?: string;
}

type TableRow = WideStudentRecord | LongGradeRecord;

// 成绩等级获取函数
const getGradeLevel = (score: number): { level: string; color: string } => {
  if (score >= 90)
    return {
      level: "优秀",
      color: "bg-[#B9FF66] text-black border-2 border-black",
    };
  if (score >= 80)
    return {
      level: "良好",
      color: "bg-[#F7931E] text-white border-2 border-black",
    };
  if (score >= 70)
    return {
      level: "中等",
      color: "bg-[#FED7D7] text-black border-2 border-black",
    };
  if (score >= 60)
    return {
      level: "及格",
      color: "bg-[#9C88FF] text-white border-2 border-black",
    };
  return {
    level: "不及格",
    color: "bg-[#FF6B6B] text-white border-2 border-black",
  };
};

// 主组件
export const SimpleGradeDataTable: React.FC<SimpleGradeDataTableProps> = ({
  className = "",
  pageSize = 20,
}) => {
  const {
    filteredGradeData,
    availableSubjects,
    availableClasses,
    loading,
    error,
  } = useModernGradeAnalysis();

  // 状态管理
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<FilterOptions>({
    search: "",
    classFilter: "__all_classes__",
    subjectFilter: "__all_subjects__",
    scoreRange: [0, 100],
  });

  // 将长表格数据转换为宽表格格式（每个学生一行）
  const transformToWideFormat = (data: LongGradeRecord[]) => {
    const studentGroups = data.reduce<Record<string, WideStudentRecord>>(
      (acc, record) => {
        const studentKey = record.student_id;
        if (!acc[studentKey]) {
          acc[studentKey] = {
            student_id: record.student_id,
            name: record.name,
            class_name: record.class_name,
            exam_date: record.exam_date,
            subjects: {},
          };
        }

        if (record.subject) {
          acc[studentKey].subjects[record.subject] = {
            score: record.score || record.total_score,
            grade: record.grade,
            rank: record.rank_in_class,
          };
        }

        return acc;
      },
      {}
    );

    return Object.values(studentGroups);
  };

  // 应用筛选逻辑
  const filteredAndPaginatedData = useMemo<{
    data: TableRow[];
    total: number;
    totalPages: number;
    isWideFormat: boolean;
  }>(() => {
    let filtered = [...filteredGradeData] as LongGradeRecord[];

    // 搜索筛选
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (record) =>
          record.name?.toLowerCase().includes(searchLower) ||
          record.student_id?.toLowerCase().includes(searchLower)
      );
    }

    // 班级筛选
    if (filters.classFilter !== "__all_classes__") {
      filtered = filtered.filter(
        (record) => record.class_name === filters.classFilter
      );
    }

    // 科目筛选 - 只在科目筛选时保持长格式，否则转为宽格式
    if (filters.subjectFilter !== "__all_subjects__") {
      filtered = filtered.filter(
        (record) => record.subject === filters.subjectFilter
      );

      // 分数范围筛选
      filtered = filtered.filter((record) => {
        const score = record.score || record.total_score;
        if (score === null || score === undefined) return false;
        return score >= filters.scoreRange[0] && score <= filters.scoreRange[1];
      });

      // 分页 - 长格式
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedData = filtered.slice(startIndex, endIndex);

      return {
        data: paginatedData,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / pageSize),
        isWideFormat: false,
      };
    } else {
      // 转换为宽格式 - 每个学生一行
      const wideFormatData = transformToWideFormat(filtered);

      // 在宽格式上应用分数范围筛选
      const filteredWideData = wideFormatData.filter((student) => {
        const scores = Object.values(student.subjects)
          .map((subject: any) => subject.score)
          .filter(Boolean);
        if (scores.length === 0) return false;
        const avgScore =
          scores.reduce((sum, score) => sum + score, 0) / scores.length;
        return (
          avgScore >= filters.scoreRange[0] && avgScore <= filters.scoreRange[1]
        );
      });

      // 分页 - 宽格式
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedData = filteredWideData.slice(startIndex, endIndex);

      return {
        data: paginatedData,
        total: filteredWideData.length,
        totalPages: Math.ceil(filteredWideData.length / pageSize),
        isWideFormat: true,
      };
    }
  }, [filteredGradeData, filters, currentPage, pageSize]);

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
      scoreRange: [0, 100],
    });
    setCurrentPage(1);
  }, []);

  const handleExport = useCallback(() => {
    try {
      const csvContent = [
        // CSV 头部
        [
          "学号",
          "姓名",
          "班级",
          "科目",
          "分数",
          "等级",
          "班级排名",
          "考试日期",
        ],
        // 数据行
        ...filteredAndPaginatedData.data.map((record) => {
          const isLongRecord = "subject" in record;
          const score = isLongRecord
            ? record.score || record.total_score
            : undefined;
          return [
            record.student_id || "",
            record.name || "",
            record.class_name || "",
            isLongRecord ? record.subject || "" : "",
            score || "",
            isLongRecord ? record.grade || "" : "",
            isLongRecord ? record.rank_in_class || "" : "",
            record.exam_date
              ? new Date(record.exam_date).toLocaleDateString("zh-CN")
              : "",
          ];
        }),
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
  }, [filteredAndPaginatedData.data]);

  if (loading) {
    return (
      <Card
        className={cn(
          "border-2 border-black shadow-[6px_6px_0px_0px_#191A23]",
          className
        )}
      >
        <CardHeader>
          <CardTitle className="text-2xl font-black text-[#191A23]">
            成绩数据表
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-[#B9FF66] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[#191A23] font-medium">正在加载成绩数据...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card
        className={cn(
          "border-2 border-black shadow-[6px_6px_0px_0px_#FF6B6B]",
          className
        )}
      >
        <CardContent className="p-8">
          <div className="text-center">
            <p className="text-[#FF6B6B] mb-4 font-bold">
              数据加载失败: {error}
            </p>
            <Button
              onClick={() => window.location.reload()}
              className="border-2 border-black bg-[#FF6B6B] hover:bg-[#E55555] text-white font-bold shadow-[4px_4px_0px_0px_#191A23]"
            >
              重试
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { data, total, totalPages, isWideFormat } = filteredAndPaginatedData;

  // 获取所有可用的科目（用于宽格式表头）
  const allSubjects = useMemo(() => {
    if (!isWideFormat) return [];
    const subjects = new Set<string>();
    filteredGradeData.forEach((record) => {
      if (record.subject) subjects.add(record.subject);
    });
    return Array.from(subjects).sort();
  }, [filteredGradeData, isWideFormat]);

  return (
    <Card
      className={cn(
        "border-2 border-black shadow-[6px_6px_0px_0px_#191A23]",
        className
      )}
    >
      <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-2xl font-black text-[#191A23]">
            成绩数据表
          </CardTitle>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleExport}
              disabled={data.length === 0}
              className="border-2 border-black bg-white hover:bg-[#F3F3F3] text-black font-bold shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23] transition-all"
            >
              <Download className="w-4 h-4 mr-2" />
              导出CSV
            </Button>
            <Button
              onClick={handleReset}
              className="border-2 border-black bg-[#F7931E] hover:bg-[#E8821C] text-white font-bold shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23] transition-all"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              重置
            </Button>
          </div>
        </div>

        {/* Positivus风格筛选器 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-[#191A23]" />
            <Input
              placeholder="搜索学号或姓名..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="pl-10 border-2 border-black font-medium shadow-[4px_4px_0px_0px_#191A23]"
            />
          </div>

          <Select
            value={filters.classFilter}
            onValueChange={(value) => handleFilterChange("classFilter", value)}
          >
            <SelectTrigger className="border-2 border-black font-medium shadow-[4px_4px_0px_0px_#191A23]">
              <SelectValue placeholder="选择班级" />
            </SelectTrigger>
            <SelectContent className="border-2 border-black">
              <SelectItem value="__all_classes__">所有班级</SelectItem>
              {availableClasses.map((cls) => (
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
            <SelectTrigger className="border-2 border-black font-medium shadow-[4px_4px_0px_0px_#191A23]">
              <SelectValue placeholder="选择科目" />
            </SelectTrigger>
            <SelectContent className="border-2 border-black">
              <SelectItem value="__all_subjects__">所有科目</SelectItem>
              {availableSubjects.map((subject) => (
                <SelectItem key={subject} value={subject}>
                  {subject}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* 数据统计 */}
        <div className="flex items-center justify-between p-4 bg-[#F3F3F3] border-b-2 border-black">
          <div className="text-sm font-bold text-[#191A23]">
            {isWideFormat ? (
              <>
                共{" "}
                <span className="text-[#B9FF66] bg-[#191A23] px-2 py-1 rounded">
                  {total}
                </span>{" "}
                名学生， 当前第{" "}
                <span className="text-[#F7931E] bg-[#191A23] px-2 py-1 rounded">
                  {currentPage}
                </span>{" "}
                页， 共{" "}
                <span className="text-[#9C88FF] bg-[#191A23] px-2 py-1 rounded">
                  {totalPages}
                </span>{" "}
                页
              </>
            ) : (
              <>
                共{" "}
                <span className="text-[#B9FF66] bg-[#191A23] px-2 py-1 rounded">
                  {total}
                </span>{" "}
                条记录， 当前第{" "}
                <span className="text-[#F7931E] bg-[#191A23] px-2 py-1 rounded">
                  {currentPage}
                </span>{" "}
                页， 共{" "}
                <span className="text-[#9C88FF] bg-[#191A23] px-2 py-1 rounded">
                  {totalPages}
                </span>{" "}
                页
              </>
            )}
          </div>
          <div className="text-sm font-bold text-[#191A23]">
            本页显示{" "}
            <span className="text-[#FF6B6B] bg-[#191A23] px-2 py-1 rounded">
              {data.length}
            </span>{" "}
            条
          </div>
        </div>

        {/* 表格内容 */}
        {data.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[#191A23] mb-4 font-bold text-lg">暂无数据</p>
            <Button
              onClick={handleReset}
              className="border-2 border-black bg-[#B9FF66] hover:bg-[#A8E055] text-black font-bold shadow-[4px_4px_0px_0px_#191A23]"
            >
              <Filter className="w-4 h-4 mr-2" />
              清除筛选条件
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-[#F3F3F3]">
                <TableRow className="border-b-2 border-black">
                  <TableHead className="font-black text-[#191A23] border-r border-gray-300">
                    学号
                  </TableHead>
                  <TableHead className="font-black text-[#191A23] border-r border-gray-300">
                    姓名
                  </TableHead>
                  <TableHead className="font-black text-[#191A23] border-r border-gray-300">
                    班级
                  </TableHead>
                  {isWideFormat ? (
                    // 宽格式：显示所有科目列
                    allSubjects.map((subject) => (
                      <TableHead
                        key={subject}
                        className="font-black text-[#191A23] border-r border-gray-300 text-center min-w-[120px]"
                      >
                        {subject}
                      </TableHead>
                    ))
                  ) : (
                    // 长格式：显示科目、分数、等级、排名列
                    <>
                      <TableHead className="font-black text-[#191A23] border-r border-gray-300">
                        科目
                      </TableHead>
                      <TableHead className="font-black text-[#191A23] border-r border-gray-300 text-center">
                        分数
                      </TableHead>
                      <TableHead className="font-black text-[#191A23] border-r border-gray-300 text-center">
                        等级
                      </TableHead>
                      <TableHead className="font-black text-[#191A23] text-center">
                        排名
                      </TableHead>
                    </>
                  )}
                  {isWideFormat && (
                    <TableHead className="font-black text-[#191A23] text-center">
                      平均分
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((record, index) => {
                  if (isWideFormat) {
                    // 宽格式渲染：每个学生一行
                    const wideRecord = record as WideStudentRecord;
                    const scores = Object.values(wideRecord.subjects)
                      .map((subject: any) => subject.score)
                      .filter(Boolean);
                    const avgScore =
                      scores.length > 0
                        ? scores.reduce((sum, score) => sum + score, 0) /
                          scores.length
                        : 0;
                    const avgGradeLevel =
                      avgScore > 0 ? getGradeLevel(avgScore) : null;

                    return (
                      <TableRow
                        key={wideRecord.student_id}
                        className={cn(
                          "border-b border-gray-200 hover:bg-[#F3F3F3] transition-colors",
                          index % 2 === 0 && "bg-white"
                        )}
                      >
                        <TableCell className="font-mono text-sm font-medium border-r border-gray-200">
                          {wideRecord.student_id}
                        </TableCell>
                        <TableCell className="font-bold text-[#191A23] border-r border-gray-200">
                          {wideRecord.name}
                        </TableCell>
                        <TableCell className="border-r border-gray-200">
                          <Badge className="bg-[#F3F3F3] text-[#191A23] border-2 border-black font-bold">
                            {wideRecord.class_name}
                          </Badge>
                        </TableCell>
                        {allSubjects.map((subject) => {
                          const subjectData = wideRecord.subjects[subject];
                          const score = subjectData?.score;
                          const grade = subjectData?.grade;
                          const gradeLevel = score
                            ? getGradeLevel(score)
                            : null;

                          return (
                            <TableCell
                              key={subject}
                              className="text-center border-r border-gray-200"
                            >
                              {score ? (
                                <div className="flex flex-col items-center gap-1">
                                  <span className="text-lg font-black text-[#191A23]">
                                    {score}
                                  </span>
                                  {grade && (
                                    <Badge className="text-xs bg-[#B9FF66] text-[#191A23] border border-black font-bold">
                                      {grade}
                                    </Badge>
                                  )}
                                  {gradeLevel && !grade && (
                                    <Badge
                                      className={`text-xs font-bold ${gradeLevel.color}`}
                                    >
                                      {gradeLevel.level}
                                    </Badge>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xl font-black text-[#191A23]">
                              {avgScore.toFixed(1)}
                            </span>
                            {avgGradeLevel && (
                              <Badge
                                className={`text-xs font-bold ${avgGradeLevel.color}`}
                              >
                                {avgGradeLevel.level}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  } else {
                    // 长格式渲染：原有的显示方式
                    const longRecord = record as LongGradeRecord;
                    const score = longRecord.score || longRecord.total_score;
                    const gradeLevel = score ? getGradeLevel(score) : null;

                    return (
                      <TableRow
                        key={longRecord.id}
                        className={cn(
                          "border-b border-gray-200 hover:bg-[#F3F3F3] transition-colors",
                          index % 2 === 0 && "bg-white"
                        )}
                      >
                        <TableCell className="font-mono text-sm font-medium border-r border-gray-200">
                          {longRecord.student_id}
                        </TableCell>
                        <TableCell className="font-bold text-[#191A23] border-r border-gray-200">
                          {longRecord.name}
                        </TableCell>
                        <TableCell className="border-r border-gray-200">
                          <Badge className="bg-[#F3F3F3] text-[#191A23] border-2 border-black font-bold">
                            {longRecord.class_name}
                          </Badge>
                        </TableCell>
                        <TableCell className="border-r border-gray-200">
                          <Badge className="bg-[#9C88FF] text-white border-2 border-black font-bold">
                            {longRecord.subject}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center border-r border-gray-200">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-2xl font-black text-[#191A23]">
                              {score || "-"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center border-r border-gray-200">
                          {gradeLevel && (
                            <Badge className={`font-bold ${gradeLevel.color}`}>
                              {gradeLevel.level}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-bold text-[#191A23]">
                            {longRecord.rank_in_class
                              ? `第${longRecord.rank_in_class}名`
                              : "-"}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  }
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Positivus风格分页控件 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 bg-[#F3F3F3] border-t-2 border-black">
            <Button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="border-2 border-black bg-white hover:bg-[#F3F3F3] text-black font-bold shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                    onClick={() => handlePageChange(pageNum)}
                    className={cn(
                      "w-10 h-10 border-2 border-black font-black shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23] transition-all",
                      pageNum === currentPage
                        ? "bg-[#B9FF66] text-black"
                        : "bg-white hover:bg-[#F3F3F3] text-black"
                    )}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <Button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="border-2 border-black bg-white hover:bg-[#F3F3F3] text-black font-bold shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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

export default SimpleGradeDataTable;
