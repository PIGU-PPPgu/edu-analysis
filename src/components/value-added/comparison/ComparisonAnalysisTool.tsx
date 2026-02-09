"use client";

/**
 * 数据对比分析工具 - 重构版
 * 参考汇优评设计，支持多维度对比分析
 */

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  TrendingUp,
  Users,
  BookOpen,
  Calendar,
  Download,
  RefreshCw,
  Loader2,
  Filter,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart,
  Cell,
} from "recharts";
import { toast } from "sonner";
import {
  fetchTimePeriodComparison,
  fetchClassComparison,
  fetchSubjectComparison,
  fetchTeacherComparison,
  fetchAvailableActivities,
  type TimePeriodData,
  type ClassComparisonData,
  type SubjectComparisonData,
  type TeacherComparisonData,
  type ActivityInfo,
} from "@/services/comparisonAnalysisService";
import { safeToFixed, safePercent, safeNumber } from "@/utils/formatUtils";

interface ComparisonAnalysisToolProps {
  loading?: boolean;
}

// 对比类型
type ComparisonType = "time" | "class" | "subject" | "teacher";

// 科目列表（注：数据库中"道法"会自动映射为"政治"）
const SUBJECTS = [
  { value: "all", label: "全部科目" },
  { value: "语文", label: "语文" },
  { value: "数学", label: "数学" },
  { value: "英语", label: "英语" },
  { value: "物理", label: "物理" },
  { value: "化学", label: "化学" },
  { value: "生物", label: "生物" },
  { value: "政治", label: "政治/道法" },
  { value: "历史", label: "历史" },
  { value: "地理", label: "地理" },
];

export function ComparisonAnalysisTool({
  loading: parentLoading = false,
}: ComparisonAnalysisToolProps) {
  // ===== 筛选状态 =====
  const [comparisonType, setComparisonType] = useState<ComparisonType>("class");
  const [activities, setActivities] = useState<ActivityInfo[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");

  // ===== 数据状态 =====
  const [timeData, setTimeData] = useState<TimePeriodData[]>([]);
  const [classData, setClassData] = useState<ClassComparisonData[]>([]);
  const [subjectData, setSubjectData] = useState<SubjectComparisonData[]>([]);
  const [teacherData, setTeacherData] = useState<TeacherComparisonData[]>([]);

  // ===== UI状态 =====
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [classComparisonTab, setClassComparisonTab] =
    useState("value-added-rate");

  // 加载活动列表
  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    const result = await fetchAvailableActivities();
    setActivities(result);
    if (result.length > 0 && !selectedActivity) {
      setSelectedActivity(result[0].id);
    }
  };

  // 筛选数据
  const handleFilter = async () => {
    if (!selectedActivity && comparisonType !== "time") {
      toast.error("请先选择一个增值活动");
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      switch (comparisonType) {
        case "time":
          const timeResult = await fetchTimePeriodComparison(3);
          setTimeData(timeResult);
          if (timeResult.length === 0) {
            toast.info("暂无时间段对比数据");
          }
          break;

        case "class":
          const classResult = await fetchClassComparison(
            selectedActivity,
            selectedSubject === "all" ? undefined : selectedSubject
          );
          setClassData(classResult);
          if (classResult.length === 0) {
            toast.info("暂无班级对比数据");
          }
          break;

        case "subject":
          const subjectResult = await fetchSubjectComparison(selectedActivity);
          setSubjectData(subjectResult);
          if (subjectResult.length === 0) {
            toast.info("暂无科目对比数据");
          }
          break;

        case "teacher":
          const teacherResult = await fetchTeacherComparison(
            selectedActivity,
            selectedSubject === "all" ? undefined : selectedSubject
          );
          setTeacherData(teacherResult);
          if (teacherResult.length === 0) {
            toast.info("暂无教师对比数据");
          }
          break;
      }
    } catch (err) {
      console.error("加载对比数据失败:", err);
      setError("加载数据失败，请重试");
      toast.error("加载数据失败");
    } finally {
      setLoading(false);
    }
  };

  // 重置筛选
  const handleReset = () => {
    setComparisonType("class");
    setSelectedActivity(activities[0]?.id || "");
    setSelectedSubject("all");
    setTimeData([]);
    setClassData([]);
    setSubjectData([]);
    setTeacherData([]);
    setHasSearched(false);
    setError(null);
  };

  // ===== 渲染函数 =====
  const renderTimeComparison = () => {
    if (timeData.length === 0) return renderEmptyState();

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              时间段对比分析
            </CardTitle>
            <CardDescription>
              对比最近{timeData.length}次考试的增值表现趋势
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 平均分对比 */}
            <div>
              <h4 className="text-sm font-semibold mb-3">平均分趋势</h4>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={timeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="avgScore"
                    name="平均分"
                    fill="hsl(var(--chart-1))"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* 增值率对比 */}
            <div>
              <h4 className="text-sm font-semibold mb-3">增值率对比</h4>
              <ResponsiveContainer width="100%" height={250}>
                <ComposedChart data={timeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis
                    yAxisId="left"
                    label={{
                      value: "增值率(%)",
                      angle: -90,
                      position: "insideLeft",
                    }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    label={{
                      value: "优秀率(%)",
                      angle: 90,
                      position: "insideRight",
                    }}
                  />
                  <Tooltip />
                  <Legend />
                  <Bar
                    yAxisId="left"
                    dataKey="valueAddedRate"
                    name="增值率"
                    fill="hsl(var(--chart-2))"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="excellentRate"
                    name="优秀率"
                    stroke="hsl(var(--chart-3))"
                    strokeWidth={2}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* 关键指标对比表 */}
            <div className="grid grid-cols-3 gap-4">
              {timeData.map((period, idx) => (
                <Card
                  key={idx}
                  className={idx === 0 ? "border-blue-500 border-2" : ""}
                >
                  <CardContent className="p-4">
                    <div className="text-center">
                      <Badge
                        variant={idx === 0 ? "default" : "outline"}
                        className="mb-2"
                      >
                        {period.name}
                      </Badge>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">平均分</span>
                          <span className="font-semibold">
                            {safeToFixed(period.avgScore, 1)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">增值率</span>
                          <span
                            className="font-semibold"
                            style={{ color: "#B9FF66" }}
                          >
                            {safeToFixed(period.valueAddedRate, 1)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">优秀率</span>
                          <span className="font-semibold">
                            {safeToFixed(period.excellentRate, 1)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">及格率</span>
                          <span className="font-semibold">
                            {safeToFixed(period.passRate, 1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderClassComparison = () => {
    if (classData.length === 0) return renderEmptyState();

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              班级横向对比
            </CardTitle>
            <CardDescription>
              对比不同班级的增值表现，识别优秀教学实践
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 班级增值率排名 */}
            <div>
              <h4 className="text-sm font-semibold mb-3">班级增值率排名</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={classData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    label={{ value: "增值率(%)", position: "bottom" }}
                  />
                  <YAxis dataKey="name" type="category" width={80} />
                  <Tooltip />
                  <Bar
                    dataKey="valueAddedRate"
                    name="增值率"
                    fill="hsl(var(--chart-1))"
                  >
                    {classData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          index === 0
                            ? "hsl(var(--chart-2))"
                            : index === 1
                              ? "hsl(var(--chart-1))"
                              : "hsl(var(--chart-gray))"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* 增值分析图表 - Tabs切换 */}
            <div>
              <Tabs
                value={classComparisonTab}
                onValueChange={setClassComparisonTab}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="value-added-rate">增值率排名</TabsTrigger>
                  <TabsTrigger value="score-comparison">分数对比</TabsTrigger>
                </TabsList>

                {/* Tab 1: 增值率排名条形图 */}
                <TabsContent value="value-added-rate" className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    横向对比各班级增值率，直观展示教学效果排名
                  </p>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={classData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        type="number"
                        label={{
                          value: "增值率 (%)",
                          position: "insideBottom",
                          offset: -5,
                        }}
                      />
                      <YAxis dataKey="className" type="category" width={100} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white dark:bg-gray-800 p-3 border rounded shadow-lg">
                                <p className="font-semibold">
                                  {data.className}
                                </p>
                                <p className="text-sm">
                                  增值率: {data.valueAddedRate}%
                                </p>
                                <p className="text-sm">
                                  学生数: {data.students}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar
                        dataKey="valueAddedRate"
                        name="增值率"
                        radius={[0, 4, 4, 0]}
                      >
                        {classData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              entry.valueAddedRate >= 12
                                ? "#B9FF66" // green
                                : entry.valueAddedRate >= 10
                                  ? "#3b82f6" // blue
                                  : "#94a3b8" // gray
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex gap-4 text-xs text-muted-foreground justify-center">
                    <div className="flex items-center gap-1">
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: "#B9FF66" }}
                      ></div>
                      <span>优秀 (增值≥12%)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: "#3b82f6" }}
                      ></div>
                      <span>良好 (增值≥10%)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: "#94a3b8" }}
                      ></div>
                      <span>一般 ({"<"}10%)</span>
                    </div>
                  </div>
                </TabsContent>

                {/* Tab 2: 入口分vs出口分对比 */}
                <TabsContent value="score-comparison" className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    对比入口分和出口分，识别"低进高出"的优秀班级
                  </p>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={classData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="className"
                        angle={-45}
                        textAnchor="end"
                        height={100}
                      />
                      <YAxis
                        label={{
                          value: "平均分",
                          angle: -90,
                          position: "insideLeft",
                        }}
                      />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="entryScore"
                        name="入口分"
                        fill="#94a3b8"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="exitScore"
                        name="出口分"
                        fill="#B9FF66"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </TabsContent>
              </Tabs>
            </div>

            {/* 详细对比表 - 增强版（参照汇优评15列设计） */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-3 py-2 text-left">排名</th>
                    <th className="px-3 py-2 text-left">班级</th>
                    <th className="px-3 py-2 text-right">入口分</th>
                    <th className="px-3 py-2 text-right">出口分</th>
                    <th className="px-3 py-2 text-right">增值率</th>
                    <th className="px-3 py-2 text-right">入口标准分</th>
                    <th className="px-3 py-2 text-right">出口标准分</th>
                    <th className="px-3 py-2 text-right">优秀率</th>
                    <th className="px-3 py-2 text-right">及格率</th>
                    <th className="px-3 py-2 text-right">学生数</th>
                    <th className="px-3 py-2 text-center">评价</th>
                  </tr>
                </thead>
                <tbody>
                  {classData.map((cls, idx) => (
                    <tr
                      key={idx}
                      className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="px-3 py-3">
                        <Badge variant={idx === 0 ? "default" : "outline"}>
                          #{idx + 1}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 font-medium">{cls.className}</td>
                      <td className="px-3 py-3 text-right text-muted-foreground">
                        {safeToFixed(cls.entryScore, 1)}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold">
                        {safeToFixed(cls.exitScore, 1)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span
                          style={{
                            color:
                              cls.valueAddedRate >= 12
                                ? "#B9FF66"
                                : cls.valueAddedRate >= 10
                                  ? "#3b82f6"
                                  : undefined,
                            fontWeight:
                              cls.valueAddedRate >= 12
                                ? 700
                                : cls.valueAddedRate >= 10
                                  ? 600
                                  : undefined,
                          }}
                        >
                          {safeToFixed(cls.valueAddedRate, 1)}%
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right text-xs text-muted-foreground">
                        {safeToFixed(cls.entryStandardScore, 2)}
                      </td>
                      <td className="px-3 py-3 text-right text-xs text-muted-foreground">
                        {safeToFixed(cls.exitStandardScore, 2)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span
                          style={{
                            color:
                              cls.excellentRate >= 30 ? "#B9FF66" : undefined,
                            fontWeight:
                              cls.excellentRate >= 30 ? 600 : undefined,
                          }}
                        >
                          {safeToFixed(cls.excellentRate, 1)}%
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span
                          style={{
                            color:
                              cls.passRate >= 90
                                ? "#B9FF66"
                                : cls.passRate >= 80
                                  ? "#3b82f6"
                                  : undefined,
                          }}
                        >
                          {safeToFixed(cls.passRate, 1)}%
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">{cls.students}</td>
                      <td className="px-3 py-3 text-center">
                        {cls.valueAddedRate >= 12 ? (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200">
                            优秀
                          </Badge>
                        ) : cls.valueAddedRate >= 10 ? (
                          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                            良好
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                            一般
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderSubjectComparison = () => {
    if (subjectData.length === 0) return renderEmptyState();

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              学科横向对比
            </CardTitle>
            <CardDescription>
              对比各学科的增值表现，识别优势和薄弱学科
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 学科增值率对比 */}
            <div>
              <h4 className="text-sm font-semibold mb-3">各学科增值率对比</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={subjectData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis
                    label={{
                      value: "增值率(%)",
                      angle: -90,
                      position: "insideLeft",
                    }}
                  />
                  <Tooltip />
                  <Legend />
                  <ReferenceLine
                    y={12}
                    stroke="hsl(var(--destructive))"
                    strokeDasharray="3 3"
                    label="平均水平"
                  />
                  <Bar
                    dataKey="valueAddedRate"
                    name="增值率"
                    fill="hsl(var(--chart-1))"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* 入口vs出口对比 */}
            <div>
              <h4 className="text-sm font-semibold mb-3">
                入口分 vs 出口分对比
              </h4>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={subjectData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="entryScore"
                    name="入口分"
                    stroke="hsl(var(--chart-gray))"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="exitScore"
                    name="出口分"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* 详细对比表 - 增强版 */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-3 py-2 text-left">科目</th>
                    <th className="px-3 py-2 text-right">入口分</th>
                    <th className="px-3 py-2 text-right">出口分</th>
                    <th className="px-3 py-2 text-right">增值率</th>
                    <th className="px-3 py-2 text-right">优秀率</th>
                    <th className="px-3 py-2 text-right">入口标准分</th>
                    <th className="px-3 py-2 text-right">出口标准分</th>
                  </tr>
                </thead>
                <tbody>
                  {subjectData.map((sub, idx) => (
                    <tr
                      key={idx}
                      className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="px-3 py-3 font-medium">{sub.subject}</td>
                      <td className="px-3 py-3 text-right text-muted-foreground">
                        {safeToFixed(sub.entryScore, 1)}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold">
                        {safeToFixed(sub.exitScore, 1)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span
                          style={{
                            color:
                              sub.valueAddedRate >= 12 ? "#B9FF66" : undefined,
                            fontWeight:
                              sub.valueAddedRate >= 12 ? 700 : undefined,
                          }}
                        >
                          {safeToFixed(sub.valueAddedRate, 1)}%
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        {safeToFixed(sub.excellentRate, 1)}%
                      </td>
                      <td className="px-3 py-3 text-right text-xs text-muted-foreground">
                        {safeToFixed(sub.entryStandardScore, 2)}
                      </td>
                      <td className="px-3 py-3 text-right text-xs text-muted-foreground">
                        {safeToFixed(sub.exitStandardScore, 2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderTeacherComparison = () => {
    if (teacherData.length === 0) return renderEmptyState();

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              教师横向对比
            </CardTitle>
            <CardDescription>对比同科目不同教师的增值表现</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 教师综合能力对比 */}
            <div>
              <h4 className="text-sm font-semibold mb-3">教师综合能力对比</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={teacherData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="valueAddedRate"
                    name="增值率"
                    fill="hsl(var(--chart-1))"
                  />
                  <Bar
                    dataKey="consolidationRate"
                    name="巩固率"
                    fill="hsl(var(--chart-2))"
                  />
                  <Bar
                    dataKey="transformationRate"
                    name="转化率"
                    fill="hsl(var(--chart-3))"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* 详细对比表 - 增强版 */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-3 py-2 text-left">教师</th>
                    <th className="px-3 py-2 text-right">平均分</th>
                    <th className="px-3 py-2 text-right">增值率</th>
                    <th className="px-3 py-2 text-right">巩固率</th>
                    <th className="px-3 py-2 text-right">转化率</th>
                    <th className="px-3 py-2 text-right">贡献率</th>
                    <th className="px-3 py-2 text-right">学生数</th>
                  </tr>
                </thead>
                <tbody>
                  {teacherData.map((teacher, idx) => (
                    <tr
                      key={idx}
                      className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="px-3 py-3 font-medium">
                        {teacher.teacherName}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {safeToFixed(teacher.avgScore, 1)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span
                          style={{
                            color:
                              teacher.valueAddedRate >= 12
                                ? "#B9FF66"
                                : undefined,
                            fontWeight:
                              teacher.valueAddedRate >= 12 ? 700 : undefined,
                          }}
                        >
                          {safeToFixed(teacher.valueAddedRate, 1)}%
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        {safeToFixed(teacher.consolidationRate, 1)}%
                      </td>
                      <td className="px-3 py-3 text-right">
                        {safeToFixed(teacher.transformationRate, 1)}%
                      </td>
                      <td className="px-3 py-3 text-right font-semibold">
                        {safeToFixed(teacher.contributionRate, 1)}%
                      </td>
                      <td className="px-3 py-3 text-right">
                        {teacher.students}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderEmptyState = () => (
    <Card>
      <CardContent className="p-12">
        <div className="flex flex-col items-center justify-center text-center space-y-3">
          <AlertCircle className="h-12 w-12 text-gray-400" />
          <div>
            <p className="text-lg font-semibold text-muted-foreground">
              暂无数据
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {hasSearched
                ? "当前筛选条件下没有找到数据"
                : '请先选择筛选条件并点击"筛选"按钮'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* 筛选区域 - 参考汇优评设计 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            数据对比分析工具
          </CardTitle>
          <CardDescription>
            选择对比维度和筛选条件，深入分析增值表现差异
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* 筛选器行 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* 对比类型 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">对比类型</label>
                <Select
                  value={comparisonType}
                  onValueChange={(v) => setComparisonType(v as ComparisonType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择对比类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="time">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>时间对比</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="class">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>班级对比</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="subject">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        <span>学科对比</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="teacher">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        <span>教师对比</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 增值活动 */}
              {comparisonType !== "time" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">增值活动</label>
                  <Select
                    value={selectedActivity}
                    onValueChange={setSelectedActivity}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择活动" />
                    </SelectTrigger>
                    <SelectContent>
                      {activities.map((act) => (
                        <SelectItem key={act.id} value={act.id}>
                          {act.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* 科目筛选 */}
              {(comparisonType === "class" || comparisonType === "teacher") && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">科目</label>
                  <Select
                    value={selectedSubject}
                    onValueChange={setSelectedSubject}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择科目" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBJECTS.map((sub) => (
                        <SelectItem key={sub.value} value={sub.value}>
                          {sub.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-2">
              <Button onClick={handleFilter} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    加载中...
                  </>
                ) : (
                  <>
                    <Filter className="h-4 w-4 mr-2" />
                    筛选
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={loading}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                重置
              </Button>
              <Button
                variant="outline"
                className="ml-auto"
                disabled={!hasSearched || loading}
              >
                <Download className="h-4 w-4 mr-2" />
                导出报告
              </Button>
            </div>

            {/* 筛选结果反馈 */}
            {hasSearched && !loading && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  {comparisonType === "class" &&
                    `已找到 ${classData.length} 条班级数据`}
                  {comparisonType === "teacher" &&
                    `已找到 ${teacherData.length} 条教师数据`}
                  {comparisonType === "subject" &&
                    `已找到 ${subjectData.length} 条学科数据`}
                  {comparisonType === "time" &&
                    `已找到 ${timeData.length} 个时间段数据`}
                  {selectedSubject !== "all" &&
                    ` (科目: ${SUBJECTS.find((s) => s.value === selectedSubject)?.label})`}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 数据展示区域 */}
      {hasSearched && !loading && !error && (
        <>
          {comparisonType === "time" && renderTimeComparison()}
          {comparisonType === "class" && renderClassComparison()}
          {comparisonType === "subject" && renderSubjectComparison()}
          {comparisonType === "teacher" && renderTeacherComparison()}
        </>
      )}

      {/* 错误提示 */}
      {error && (
        <Card className="border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 初始状态提示 */}
      {!hasSearched && !loading && (
        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center text-center space-y-3">
              <BarChart3 className="h-16 w-16 text-gray-300" />
              <div>
                <p className="text-lg font-semibold text-muted-foreground">
                  请选择筛选条件
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  选择对比类型、活动和科目后，点击"筛选"按钮查看分析结果
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
