"use client";

/**
 * 单科学生能力增值报告
 * 查看学生单科出入口等级、等级变化情况
 */

import { useState, useMemo, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  User,
  Award,
  TrendingUp,
  TrendingDown,
  Minus,
  Filter,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import type { StudentValueAdded, AbilityLevel } from "@/types/valueAddedTypes";

interface StudentAbilitySingleReportProps {
  /** 学生增值数据 */
  data: StudentValueAdded[];

  /** 是否显示加载状态 */
  loading?: boolean;
}

// 等级颜色映射
const LEVEL_COLORS: Record<AbilityLevel, string> = {
  "A+": "#16a34a",
  A: "#22c55e",
  "B+": "#84cc16",
  B: "#eab308",
  "C+": "#f97316",
  C: "#ef4444",
};

// 等级顺序(用于排序)
const LEVEL_ORDER: Record<AbilityLevel, number> = {
  "A+": 6,
  A: 5,
  "B+": 4,
  B: 3,
  "C+": 2,
  C: 1,
};

const safeToFixed = (value: any, decimals: number = 2): string => {
  if (value == null || value === undefined || isNaN(Number(value))) {
    return "0." + "0".repeat(decimals);
  }
  return Number(value).toFixed(decimals);
};

export function StudentAbilitySingleReport({
  data,
  loading = false,
}: StudentAbilitySingleReportProps) {
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLevel, setFilterLevel] = useState<string>("all");

  // P1修复：添加分页支持
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  // 提取可用科目列表
  const availableSubjects = useMemo(() => {
    const subjects = Array.from(new Set(data.map((d) => d.subject))).sort();
    return subjects;
  }, [data]);

  // 自动选择第一个科目
  useMemo(() => {
    if (availableSubjects.length > 0 && !selectedSubject) {
      setSelectedSubject(availableSubjects[0]);
    }
  }, [availableSubjects, selectedSubject]);

  // 筛选当前科目的数据
  const subjectData = useMemo(() => {
    if (!selectedSubject) return [];
    return data.filter((d) => d.subject === selectedSubject);
  }, [data, selectedSubject]);

  // 应用搜索和等级筛选
  const filteredData = useMemo(() => {
    let result = subjectData;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (d) =>
          d.student_name.toLowerCase().includes(term) ||
          d.student_id.toLowerCase().includes(term) ||
          d.class_name.toLowerCase().includes(term)
      );
    }

    if (filterLevel !== "all") {
      if (filterLevel === "consolidated") {
        result = result.filter((d) => d.is_consolidated);
      } else if (filterLevel === "transformed") {
        result = result.filter((d) => d.is_transformed);
      } else if (filterLevel === "regressed") {
        result = result.filter((d) => d.level_change < 0);
      } else if (filterLevel === "maintained") {
        result = result.filter(
          (d) => d.level_change === 0 && !d.is_consolidated
        );
      }
    }

    return result;
  }, [subjectData, searchTerm, filterLevel]);

  // P1修复：分页数据计算
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage]);

  // P1修复：总页数
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);

  // P1修复：搜索或筛选变化时重置到第1页
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterLevel, selectedSubject]);

  // 统计数据
  const statistics = useMemo(() => {
    const total = subjectData.length;
    const consolidated = subjectData.filter((d) => d.is_consolidated).length;
    const transformed = subjectData.filter((d) => d.is_transformed).length;
    const regressed = subjectData.filter((d) => d.level_change < 0).length;
    const maintained = subjectData.filter(
      (d) => d.level_change === 0 && !d.is_consolidated
    ).length;

    // 入口等级分布
    const entryLevelDist = subjectData.reduce(
      (acc, d) => {
        acc[d.entry_level] = (acc[d.entry_level] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // 出口等级分布
    const exitLevelDist = subjectData.reduce(
      (acc, d) => {
        acc[d.exit_level] = (acc[d.exit_level] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      total,
      consolidated,
      transformed,
      regressed,
      maintained,
      consolidationRate:
        total > 0 ? ((consolidated / total) * 100).toFixed(1) : "0.0",
      transformationRate:
        total > 0 ? ((transformed / total) * 100).toFixed(1) : "0.0",
      regressionRate:
        total > 0 ? ((regressed / total) * 100).toFixed(1) : "0.0",
      entryLevelDist,
      exitLevelDist,
    };
  }, [subjectData]);

  // 准备饼图数据
  const pieData = useMemo(() => {
    return [
      { name: "巩固", value: statistics.consolidated, color: "#16a34a" },
      { name: "转化", value: statistics.transformed, color: "#3b82f6" },
      { name: "保持", value: statistics.maintained, color: "#94a3b8" },
      { name: "退步", value: statistics.regressed, color: "#ef4444" },
    ].filter((item) => item.value > 0);
  }, [statistics]);

  // 入口等级分布数据
  const entryLevelPieData = useMemo(() => {
    return Object.entries(statistics.entryLevelDist).map(([level, count]) => ({
      name: level,
      value: count,
      color: LEVEL_COLORS[level as AbilityLevel],
    }));
  }, [statistics.entryLevelDist]);

  // 出口等级分布数据
  const exitLevelPieData = useMemo(() => {
    return Object.entries(statistics.exitLevelDist).map(([level, count]) => ({
      name: level,
      value: count,
      color: LEVEL_COLORS[level as AbilityLevel],
    }));
  }, [statistics.exitLevelDist]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">加载中...</div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
        <p>暂无学生增值数据</p>
        <p className="text-sm mt-2">
          请先在"增值活动"标签页中创建活动并点击"开始计算"
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 科目选择 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            科目选择
          </CardTitle>
          <CardDescription>选择科目查看学生能力等级增值情况</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger>
              <SelectValue placeholder="选择科目" />
            </SelectTrigger>
            <SelectContent>
              {availableSubjects.map((subject) => (
                <SelectItem key={subject} value={subject}>
                  {subject}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* 统计摘要 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">学生总数</div>
            <div className="text-2xl font-bold">{statistics.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">巩固率</div>
            <div className="text-2xl font-bold text-green-600">
              {statistics.consolidationRate}%
            </div>
            <div className="text-xs text-muted-foreground">
              {statistics.consolidated}人
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">转化率</div>
            <div className="text-2xl font-bold text-blue-600">
              {statistics.transformationRate}%
            </div>
            <div className="text-xs text-muted-foreground">
              {statistics.transformed}人
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">退步率</div>
            <div className="text-2xl font-bold text-red-600">
              {statistics.regressionRate}%
            </div>
            <div className="text-xs text-muted-foreground">
              {statistics.regressed}人
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 等级分布对比 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">能力变化分布</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                  label={(entry) => `${entry.name} ${entry.value}`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">入口等级分布</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={entryLevelPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                  label={(entry) => `${entry.name} ${entry.value}`}
                >
                  {entryLevelPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">出口等级分布</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={exitLevelPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                  label={(entry) => `${entry.name} ${entry.value}`}
                >
                  {exitLevelPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 筛选和搜索 */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="搜索学生姓名、学号或班级..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterLevel} onValueChange={setFilterLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="能力变化筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部学生</SelectItem>
                  <SelectItem value="consolidated">巩固学生</SelectItem>
                  <SelectItem value="transformed">转化学生</SelectItem>
                  <SelectItem value="maintained">保持学生</SelectItem>
                  <SelectItem value="regressed">退步学生</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 学生列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <User className="h-5 w-5" />
              学生能力变化列表
            </span>
            <Badge variant="outline">{filteredData.length}人</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>姓名</TableHead>
                <TableHead>学号</TableHead>
                <TableHead>班级</TableHead>
                <TableHead className="text-right">入口等级</TableHead>
                <TableHead className="text-right">出口等级</TableHead>
                <TableHead className="text-right">等级变化</TableHead>
                <TableHead className="text-right">能力状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((student, index) => (
                <TableRow key={`${student.student_id}-${index}`}>
                  <TableCell className="font-medium">
                    {student.student_name}
                  </TableCell>
                  <TableCell>{student.student_id}</TableCell>
                  <TableCell>{student.class_name}</TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant="outline"
                      style={{
                        backgroundColor: `${LEVEL_COLORS[student.entry_level]}20`,
                        borderColor: LEVEL_COLORS[student.entry_level],
                        color: LEVEL_COLORS[student.entry_level],
                      }}
                    >
                      {student.entry_level}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant="outline"
                      style={{
                        backgroundColor: `${LEVEL_COLORS[student.exit_level]}20`,
                        borderColor: LEVEL_COLORS[student.exit_level],
                        color: LEVEL_COLORS[student.exit_level],
                      }}
                    >
                      {student.exit_level}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {student.level_change > 0 ? (
                        <>
                          <Badge className="bg-green-500">
                            +{student.level_change}
                          </Badge>
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        </>
                      ) : student.level_change < 0 ? (
                        <>
                          <Badge variant="destructive">
                            {student.level_change}
                          </Badge>
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        </>
                      ) : (
                        <>
                          <Badge variant="secondary">0</Badge>
                          <Minus className="h-4 w-4 text-gray-400" />
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {student.is_consolidated && (
                      <Badge variant="default" className="bg-green-500">
                        巩固
                      </Badge>
                    )}
                    {student.is_transformed && (
                      <Badge variant="default" className="bg-blue-500">
                        转化
                      </Badge>
                    )}
                    {!student.is_consolidated &&
                      !student.is_transformed &&
                      student.level_change === 0 && (
                        <Badge variant="secondary">保持</Badge>
                      )}
                    {student.level_change < 0 && (
                      <Badge variant="destructive">退步</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredData.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              没有符合筛选条件的学生
            </div>
          )}

          {/* P1修复：分页UI */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t mt-4">
              <div className="text-sm text-muted-foreground">
                共 {filteredData.length} 条记录，第 {currentPage} / {totalPages}{" "}
                页
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  下一页
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 说明信息 */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200">
        <CardContent className="p-4">
          <div className="text-sm space-y-2">
            <p className="font-semibold">能力等级说明：</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>
                <strong>巩固</strong>：入口和出口都保持在最高等级（A+）
              </li>
              <li>
                <strong>转化</strong>：等级相比入口有所提升
              </li>
              <li>
                <strong>保持</strong>：等级没有变化但不是最高等级
              </li>
              <li>
                <strong>退步</strong>：等级相比入口有所下降
              </li>
              <li>
                <strong>等级划分</strong>
                ：基于Z分数的百分位数确定，A+为前7%，A为7-24%，B+为24-50%等
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
