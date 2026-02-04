import React, { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Download, RefreshCw, AlertTriangle } from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import {
  calculateBoxPlotData,
  groupBy,
  type BoxPlotData,
} from "@/components/analysis/services/calculationUtils";
import { formatBoxPlotDataForNivo } from "@/components/analysis/services/chartUtils";
import type { GradeRecord } from "@/types/grade";

// ============================================================================
// 类型定义
// ============================================================================

export interface ClassBoxPlotChartProps {
  /** 成绩数据 */
  gradeData: GradeRecord[];
  /** 考试ID（可选） */
  examId?: string;
  /** 自定义样式类名 */
  className?: string;
  /** 是否显示加载状态 */
  isLoading?: boolean;
}

interface ProcessedBoxPlotData {
  subject: string;
  min: number;
  max: number;
  median: number;
  q1: number;
  q3: number;
  mean: number;
  outliers: Array<{
    value: number;
    studentName: string;
    studentId: string;
  }>;
}

// ============================================================================
// 自定义组件
// ============================================================================

// Positivus风格自定义箱线图组件
const BoxPlot = (props: any) => {
  const { x, y, width, height, payload, fill } = props;
  const data = payload || {};

  const max = Math.min(data.max || 0, 100);
  const min = Math.max(data.min || 0, 0);
  const q1 = Math.min(Math.max(data.q1 || 0, min), max);
  const q3 = Math.min(Math.max(data.q3 || 0, q1), max);
  const median = Math.min(Math.max(data.median || 0, min), max);
  const mean = Math.min(Math.max(data.mean || 0, min), max);

  const getYPosition = (value: number) => y + height - (height * value) / 100;
  const strokeWidth = 3; // Positivus风格加粗线条

  return (
    <>
      {/* 📏 最小值到最大值的垂直线 - Positivus风格 */}
      <line
        stroke="#191A23"
        strokeWidth={strokeWidth}
        strokeDasharray="6 6"
        x1={x + width / 2}
        y1={getYPosition(min)}
        x2={x + width / 2}
        y2={getYPosition(max)}
      />

      {/* 🟦 Positivus风格箱体 */}
      <rect
        fill={fill || "#B9FF66"}
        stroke="#191A23"
        strokeWidth={2}
        opacity={0.8}
        x={x + width * 0.25}
        y={getYPosition(q3)}
        width={width * 0.5}
        height={getYPosition(q1) - getYPosition(q3)}
        rx={4} // 圆角
      />

      {/* 中位数线 - Positivus风格 */}
      <line
        stroke="#191A23"
        strokeWidth={strokeWidth + 1}
        x1={x + width * 0.25}
        y1={getYPosition(median)}
        x2={x + width * 0.75}
        y2={getYPosition(median)}
      />

      {/* 最小值横线 - Positivus风格 */}
      <line
        stroke="#191A23"
        strokeWidth={strokeWidth}
        x1={x + width * 0.35}
        y1={getYPosition(min)}
        x2={x + width * 0.65}
        y2={getYPosition(min)}
      />

      {/* 🔺 最大值横线 - Positivus风格 */}
      <line
        stroke="#191A23"
        strokeWidth={strokeWidth}
        x1={x + width * 0.35}
        y1={getYPosition(max)}
        x2={x + width * 0.65}
        y2={getYPosition(max)}
      />

      {/*  Positivus风格平均值点 */}
      <circle
        fill="#B9FF66"
        stroke="#191A23"
        strokeWidth={2}
        cx={x + width * 0.5}
        cy={getYPosition(mean)}
        r={4}
      />
    </>
  );
};

// Positivus风格自定义提示框
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <Card className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_#191A23] p-4">
        <CardContent className="p-0">
          <p className="font-black text-[#191A23] mb-3 text-lg uppercase tracking-wide">
            {data.subject}
          </p>
          <div className="space-y-2">
            <div className="flex justify-between items-center p-2 bg-[#FF6B6B]/20 border border-[#FF6B6B] rounded">
              <span className="font-bold text-[#191A23]">最小值:</span>
              <span className="font-black text-[#191A23]">{data.min}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-[#B9FF66]/20 border border-[#B9FF66] rounded">
              <span className="font-bold text-[#191A23]">📏 Q1:</span>
              <span className="font-black text-[#191A23]">{data.q1}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-[#B9FF66]/20 border border-[#B9FF66] rounded">
              <span className="font-bold text-[#191A23]">中位数:</span>
              <span className="font-black text-[#191A23]">{data.median}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-[#B9FF66]/20 border border-[#B9FF66] rounded">
              <span className="font-bold text-[#191A23]">📏 Q3:</span>
              <span className="font-black text-[#191A23]">{data.q3}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-[#B9FF66]/20 border border-[#B9FF66] rounded">
              <span className="font-bold text-[#191A23]">🔺 最大值:</span>
              <span className="font-black text-[#191A23]">{data.max}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-[#B9FF66]/20 border border-[#B9FF66] rounded">
              <span className="font-bold text-[#191A23]"> 平均值:</span>
              <span className="font-black text-[#B9FF66]">
                {data.mean.toFixed(1)}
              </span>
            </div>
            {data.outliers && data.outliers.length > 0 && (
              <div className="mt-3 p-2 bg-[#FF6B6B]/20 border border-[#FF6B6B] rounded">
                <p className="font-black text-[#191A23] mb-2">
                  {" "}
                  异常值 ({data.outliers.length}):
                </p>
                <div className="space-y-1">
                  {data.outliers
                    .slice(0, 3)
                    .map((outlier: any, index: number) => (
                      <div
                        key={index}
                        className="text-sm font-medium text-[#191A23]"
                      >
                        • {outlier.studentName}:{" "}
                        <span className="font-black text-[#FF6B6B]">
                          {outlier.value}分
                        </span>
                      </div>
                    ))}
                  {data.outliers.length > 3 && (
                    <div className="text-xs font-bold text-[#191A23]/70">
                      ...还有{data.outliers.length - 3}个
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
  return null;
};

// ============================================================================
// 主组件
// ============================================================================

const ClassBoxPlotChart: React.FC<ClassBoxPlotChartProps> = ({
  gradeData,
  examId,
  className = "",
  isLoading = false,
}) => {
  const [selectedClass, setSelectedClass] = useState<string>("all");

  // 确定要分析的考试ID
  const analysisExamId =
    examId ||
    (gradeData && gradeData.length > 0 ? gradeData[0]?.exam_id : null);

  // 获取可用班级列表
  const availableClasses = useMemo(() => {
    if (!gradeData || gradeData.length === 0) return [];

    const classes = new Set<string>();
    gradeData.forEach((record) => {
      if (record.class_name && record.class_name.trim()) {
        classes.add(record.class_name.trim());
      }
    });

    const classArray = Array.from(classes).sort();
    return [
      { value: "all", label: "全部班级对比" },
      ...classArray.map((c) => ({ value: c, label: c })),
    ];
  }, [gradeData]);

  // 处理箱线图数据
  const boxPlotData = useMemo((): ProcessedBoxPlotData[] => {
    if (!gradeData || gradeData.length === 0) return [];

    // 根据选择的班级过滤数据
    let filteredData = gradeData;
    if (selectedClass !== "all") {
      filteredData = gradeData.filter(
        (record) => record.class_name === selectedClass
      );
    }

    // 按科目分组，过滤掉总分
    const subjectGroups = groupBy(
      filteredData.filter((record) => record.subject !== "总分"),
      (record) => record.subject || "未知科目"
    );

    return Object.entries(subjectGroups)
      .map(([subject, records]) => {
        // 提取有效分数
        const scores = records
          .map((r) => r.score)
          .filter(
            (score): score is number =>
              typeof score === "number" && !isNaN(score)
          );

        if (scores.length === 0) {
          return {
            subject,
            min: 0,
            max: 0,
            median: 0,
            q1: 0,
            q3: 0,
            mean: 0,
            outliers: [],
          };
        }

        // 计算箱线图数据
        const boxData = calculateBoxPlotData(scores);

        // 计算异常值（超出1.5倍IQR的值）
        const iqr = boxData.q3 - boxData.q1;
        const lowerBound = boxData.q1 - 1.5 * iqr;
        const upperBound = boxData.q3 + 1.5 * iqr;

        const outliers = records
          .filter((record) => {
            const score = record.score;
            return (
              typeof score === "number" &&
              !isNaN(score) &&
              (score < lowerBound || score > upperBound)
            );
          })
          .map((record) => ({
            value: record.score as number,
            studentName: record.name || record.student_id,
            studentId: record.student_id,
          }));

        return {
          subject,
          min: boxData.min,
          max: boxData.max,
          median: boxData.median,
          q1: boxData.q1,
          q3: boxData.q3,
          mean: scores.reduce((sum, score) => sum + score, 0) / scores.length,
          outliers,
        };
      })
      .filter((data) => data.min > 0 || data.max > 0); // 过滤掉无效数据
  }, [gradeData, selectedClass]);

  // Positivus风格加载状态
  if (isLoading) {
    return (
      <Card
        className={`bg-white border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66] ${className}`}
      >
        <CardContent className="p-12 text-center">
          <div className="p-4 bg-[#B9FF66] rounded-full border-2 border-black mx-auto mb-6 w-fit">
            <div className="w-12 h-12 border-4 border-[#191A23] border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-xl font-black text-[#191A23] uppercase tracking-wide">
            📏 正在加载箱线图数据...
          </p>
        </CardContent>
      </Card>
    );
  }

  // Positivus风格无数据状态
  if (availableClasses.length <= 1) {
    return (
      <Card
        className={`bg-white border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66] ${className}`}
      >
        <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#191A23] rounded-full border-2 border-black">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-black text-white uppercase tracking-wide">
                📏 班级成绩箱线图
              </CardTitle>
              <CardDescription className="text-white/90 font-medium mt-1">
                分析各班级成绩分布情况
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <Card className="border-2 border-[#B9FF66] shadow-[4px_4px_0px_0px_#B9FF66]">
            <CardContent className="p-6 bg-[#B9FF66]/20">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-[#B9FF66] rounded-full border-2 border-black">
                  <AlertTriangle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="font-black text-[#191A23] text-lg mb-3 uppercase tracking-wide">
                    未找到班级数据，请检查：
                  </p>
                  <div className="space-y-2">
                    <div className="p-2 bg-white border border-[#B9FF66] rounded-lg">
                      <p className="text-sm font-medium text-[#191A23]">
                        • 是否正确导入了成绩数据
                      </p>
                    </div>
                    <div className="p-2 bg-white border border-[#B9FF66] rounded-lg">
                      <p className="text-sm font-medium text-[#191A23]">
                        • 导入时是否映射了班级字段
                      </p>
                    </div>
                    <div className="p-2 bg-white border border-[#B9FF66] rounded-lg">
                      <p className="text-sm font-medium text-[#191A23]">
                        • 数据中是否包含班级信息
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    );
  }

  // 获取考试标题 - 兼容不同的字段名
  const examTitle =
    (gradeData[0] as any)?.title ||
    (gradeData[0] as any)?.exam_title ||
    "当前考试";

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 控制面板 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">班级成绩箱线图</CardTitle>
              {examId && (
                <Badge variant="outline" className="text-xs">
                  {examTitle}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* 班级选择 */}
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="选择班级" />
                </SelectTrigger>
                <SelectContent>
                  {availableClasses.map((cls) => (
                    <SelectItem key={cls.value} value={cls.value}>
                      {cls.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <CardDescription>
            {selectedClass === "all"
              ? `显示全部${availableClasses.length - 1}个班级的成绩分布对比`
              : `显示${selectedClass}班级的各科目成绩分布`}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* 箱线图表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            成绩分布箱线图
            <Badge variant="secondary" className="text-xs">
              {boxPlotData.length} 个科目
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {boxPlotData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={boxPlotData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    dataKey="subject"
                    tick={{ fontSize: 12 }}
                    interval={0}
                    angle={boxPlotData.length > 5 ? -45 : 0}
                    textAnchor={boxPlotData.length > 5 ? "end" : "middle"}
                    height={boxPlotData.length > 5 ? 80 : 60}
                  />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />

                  {/* 使用自定义箱线图组件 */}
                  <Bar
                    dataKey="median"
                    shape={<BoxPlot />}
                    fill="#3B82F6"
                    name="成绩分布"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <AlertTriangle className="h-8 w-8 mb-2" />
              <span>暂无数据可显示</span>
              <span className="text-sm">请检查数据或调整筛选条件</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Positivus风格统计摘要 */}
      {boxPlotData.length > 0 && (
        <Card className="bg-white border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66]">
          <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#191A23] rounded-full border-2 border-black">
                <Download className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-2xl font-black text-white uppercase tracking-wide">
                统计摘要
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {boxPlotData.map((data, index) => (
                <Card
                  key={data.subject}
                  className="border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#B9FF66]"
                >
                  <CardHeader className="bg-[#B9FF66] border-b-2 border-black py-3">
                    <CardTitle className="font-black text-[#191A23] text-lg uppercase tracking-wide">
                      {data.subject}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-center p-2 bg-[#B9FF66]/20 border border-[#B9FF66] rounded">
                      <span className="font-bold text-[#191A23]"> 平均分:</span>
                      <span className="font-black text-[#B9FF66]">
                        {data.mean.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-[#B9FF66]/20 border border-[#B9FF66] rounded">
                      <span className="font-bold text-[#191A23]">中位数:</span>
                      <span className="font-black text-[#191A23]">
                        {data.median}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-[#B9FF66]/20 border border-[#B9FF66] rounded">
                      <span className="font-bold text-[#191A23]">
                        📏 分数范围:
                      </span>
                      <span className="font-black text-[#191A23]">
                        {data.min} - {data.max}
                      </span>
                    </div>
                    {data.outliers.length > 0 && (
                      <div className="flex justify-between items-center p-2 bg-[#FF6B6B]/20 border border-[#FF6B6B] rounded">
                        <span className="font-bold text-[#191A23]">
                          {" "}
                          异常值:
                        </span>
                        <Badge className="bg-[#FF6B6B] text-white border border-black font-bold">
                          {data.outliers.length}个
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClassBoxPlotChart;
