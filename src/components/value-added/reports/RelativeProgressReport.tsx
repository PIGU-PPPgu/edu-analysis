"use client";

/**
 * 相对进步率分析报告
 * 基于深圳市教科院增值评价模型
 * 支持两种模式：
 * - "overview"：增值活动总览，展示所有班级对比
 * - "class"：单班级详情
 */

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { StudentValueAdded } from "@/types/valueAddedTypes";
import {
  calculateRelativeProgressMetrics,
  calculateByClass,
  formatRelativeProgressRate,
  classifyRate,
  type StudentLevelData,
} from "@/utils/relativeProgressRate";

interface RelativeProgressReportProps {
  studentData: StudentValueAdded[];
  mode?: "overview" | "class";
  /** mode="class" 时传入班级名 */
  className?: string;
  loading?: boolean;
}

function toStudentLevelData(
  s: StudentValueAdded
): (StudentLevelData & { class_name: string }) | null {
  if (!s.entry_level || !s.exit_level) return null;
  return {
    student_id: s.student_id,
    entry_level: s.entry_level,
    exit_level: s.exit_level,
    class_name: s.class_name,
  };
}

/** 根据等级值自动检测总段数（6段制 or 9段制） */
function detectTotalLevels(
  students: (StudentLevelData & { class_name: string })[]
): number {
  const sixSegLevels = new Set(["A+", "A", "B+", "B", "C+", "C"]);
  const hasSixSeg = students.some(
    (s) => sixSegLevels.has(s.entry_level) || sixSegLevels.has(s.exit_level)
  );
  return hasSixSeg ? 6 : 9;
}

/** 指标卡片 */
function MetricCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className={`rounded-lg p-4 border ${color}`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

/** 单班级视图 */
function ClassView({
  students,
}: {
  students: (StudentLevelData & { class_name: string })[];
}) {
  const totalLevels = useMemo(() => detectTotalLevels(students), [students]);
  const metrics = useMemo(
    () => calculateRelativeProgressMetrics(students, totalLevels),
    [students, totalLevels]
  );
  const rating = classifyRate(metrics.relativeProgressRate);

  const barData = [
    {
      name: "保持值",
      value: parseFloat(metrics.maintenanceValue.toFixed(3)),
      fill: "#3b82f6",
    },
    {
      name: "进步值",
      value: parseFloat(metrics.progressValue.toFixed(3)),
      fill: "#22c55e",
    },
    {
      name: "退步值",
      value: parseFloat(metrics.regressValue.toFixed(3)),
      fill: "#ef4444",
    },
  ];

  return (
    <div className="space-y-4">
      {/* 核心指标 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div
          className={`rounded-lg p-4 border col-span-2 md:col-span-1 ${rating.bg} border-current`}
        >
          <p className="text-xs text-gray-500 mb-1">相对进步率</p>
          <p className={`text-3xl font-bold ${rating.color}`}>
            {formatRelativeProgressRate(metrics.relativeProgressRate)}
          </p>
          <Badge
            variant="outline"
            className={`mt-1 text-xs ${rating.color} border-current`}
          >
            {rating.label}
          </Badge>
          <p className="text-xs text-gray-400 mt-1">
            {">1 教育增值积极，<1 退步主导"}
          </p>
        </div>
        <MetricCard
          label="保持值"
          value={metrics.maintenanceValue.toFixed(3)}
          sub={`${metrics.counts.maintained} 人保持等级`}
          color="bg-blue-50 border-blue-200"
        />
        <MetricCard
          label="进步值"
          value={metrics.progressValue.toFixed(3)}
          sub={`${metrics.counts.progressed} 人等级提升`}
          color="bg-green-50 border-green-200"
        />
        <MetricCard
          label="退步值"
          value={metrics.regressValue.toFixed(3)}
          sub={`${metrics.counts.regressed} 人等级下降`}
          color="bg-red-50 border-red-200"
        />
      </div>

      {/* 人数分布 */}
      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        <div className="flex items-center justify-center gap-1 text-green-600">
          <TrendingUp className="h-4 w-4" />
          进步 {(metrics.ratios.progressed * 100).toFixed(1)}%
        </div>
        <div className="flex items-center justify-center gap-1 text-blue-600">
          <Minus className="h-4 w-4" />
          保持 {(metrics.ratios.maintained * 100).toFixed(1)}%
        </div>
        <div className="flex items-center justify-center gap-1 text-red-600">
          <TrendingDown className="h-4 w-4" />
          退步 {(metrics.ratios.regressed * 100).toFixed(1)}%
        </div>
      </div>

      {/* 柱状图 */}
      <ResponsiveContainer width="100%" height={180}>
        <BarChart
          data={barData}
          margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v: number) => v.toFixed(3)} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {barData.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* 公式说明 */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          <strong>相对进步率</strong> = (保持值 + 进步值×2) / (退步值×1.5)
          &nbsp;·&nbsp; 保持值排除最低段（9段）的保持 &nbsp;·&nbsp;
          进步值用高考等级权重加权，退步值用中考等级权重加权
        </AlertDescription>
      </Alert>
    </div>
  );
}

/** 总览视图：所有班级对比 */
function OverviewView({
  students,
}: {
  students: (StudentLevelData & { class_name: string })[];
}) {
  const totalLevels = useMemo(() => detectTotalLevels(students), [students]);
  const classMetrics = useMemo(
    () => calculateByClass(students, totalLevels),
    [students, totalLevels]
  );

  // Infinity 时用图表最大值+1作为显示上限，避免硬编码魔法数字
  const maxFiniteRate = classMetrics.reduce(
    (max, c) =>
      isFinite(c.relativeProgressRate)
        ? Math.max(max, c.relativeProgressRate)
        : max,
    0
  );
  const INFINITY_DISPLAY_VALUE = Math.max(maxFiniteRate * 1.2, 5);

  const chartData = classMetrics.map((c) => ({
    name: c.class_name,
    保持值: parseFloat(c.maintenanceValue.toFixed(3)),
    进步值: parseFloat(c.progressValue.toFixed(3)),
    退步值: parseFloat(c.regressValue.toFixed(3)),
    相对进步率: isFinite(c.relativeProgressRate)
      ? parseFloat(c.relativeProgressRate.toFixed(2))
      : parseFloat(INFINITY_DISPLAY_VALUE.toFixed(2)),
  }));

  return (
    <div className="space-y-4">
      {/* 班级排名表 */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-gray-500 text-xs">
              <th className="text-left py-2 pr-4">班级</th>
              <th className="text-right py-2 px-3">相对进步率</th>
              <th className="text-right py-2 px-3">保持值</th>
              <th className="text-right py-2 px-3">进步值</th>
              <th className="text-right py-2 px-3">退步值</th>
              <th className="text-right py-2 px-3">进步人数</th>
              <th className="text-right py-2 px-3">退步人数</th>
              <th className="text-right py-2 pl-3">评级</th>
            </tr>
          </thead>
          <tbody>
            {classMetrics.map((c, i) => {
              const rating = classifyRate(c.relativeProgressRate);
              return (
                <tr key={c.class_name} className="border-b hover:bg-gray-50">
                  <td className="py-2 pr-4 font-medium">
                    <span className="text-gray-400 mr-2">{i + 1}</span>
                    {c.class_name}
                  </td>
                  <td
                    className={`text-right py-2 px-3 font-bold ${rating.color}`}
                  >
                    {formatRelativeProgressRate(c.relativeProgressRate)}
                  </td>
                  <td className="text-right py-2 px-3 text-blue-600">
                    {c.maintenanceValue.toFixed(3)}
                  </td>
                  <td className="text-right py-2 px-3 text-green-600">
                    {c.progressValue.toFixed(3)}
                  </td>
                  <td className="text-right py-2 px-3 text-red-600">
                    {c.regressValue.toFixed(3)}
                  </td>
                  <td className="text-right py-2 px-3">
                    {c.counts.progressed}
                    <span className="text-gray-400 text-xs ml-1">
                      ({(c.ratios.progressed * 100).toFixed(0)}%)
                    </span>
                  </td>
                  <td className="text-right py-2 px-3">
                    {c.counts.regressed}
                    <span className="text-gray-400 text-xs ml-1">
                      ({(c.ratios.regressed * 100).toFixed(0)}%)
                    </span>
                  </td>
                  <td className="text-right py-2 pl-3">
                    <Badge
                      variant="outline"
                      className={`text-xs ${rating.color} border-current`}
                    >
                      {rating.label}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 相对进步率柱状图 */}
      <div>
        <p className="text-xs text-gray-500 mb-2">各班级相对进步率对比</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 16, left: 0, bottom: 40 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11 }}
              angle={-30}
              textAnchor="end"
              interval={0}
            />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <ReferenceLine
              y={1}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              label={{ value: "基准线 1.0", fontSize: 10, fill: "#f59e0b" }}
            />
            <Bar dataKey="相对进步率" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry["相对进步率"] >= 1 ? "#22c55e" : "#ef4444"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 保持/进步/退步堆叠图 */}
      <div>
        <p className="text-xs text-gray-500 mb-2">
          各班级保持值 / 进步值 / 退步值
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 16, left: 0, bottom: 40 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11 }}
              angle={-30}
              textAnchor="end"
              interval={0}
            />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => v.toFixed(3)} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="保持值" stackId="a" fill="#3b82f6" />
            <Bar dataKey="进步值" stackId="a" fill="#22c55e" />
            <Bar dataKey="退步值" fill="#ef4444" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          <strong>相对进步率 &gt;1</strong>：保持和进步主导，教育增值积极
          &nbsp;·&nbsp;
          <strong>&lt;1</strong>：退步主导，教育效果待提升 &nbsp;·&nbsp;
          基于深圳市教科院增值评价模型
        </AlertDescription>
      </Alert>
    </div>
  );
}

export function RelativeProgressReport({
  studentData,
  mode = "overview",
  className,
  loading = false,
}: RelativeProgressReportProps) {
  const validStudents = useMemo(
    () =>
      studentData
        .map(toStudentLevelData)
        .filter(
          (s): s is StudentLevelData & { class_name: string } => s !== null
        ),
    [studentData]
  );

  const filteredStudents = useMemo(() => {
    if (mode === "class" && className) {
      return validStudents.filter((s) => s.class_name === className);
    }
    return validStudents;
  }, [validStudents, mode, className]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400">
        加载中...
      </div>
    );
  }

  if (filteredStudents.length === 0) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          暂无学生等级数据，请确认增值活动已完成计算且使用了九段评价配置。
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-green-600" />
          相对进步率分析
          <Badge variant="outline" className="text-xs font-normal ml-1">
            深圳市教科院模型
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {mode === "class" ? (
          <ClassView students={filteredStudents} />
        ) : (
          <OverviewView students={filteredStudents} />
        )}
      </CardContent>
    </Card>
  );
}
