import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Download, RefreshCw, AlertTriangle } from "lucide-react";
import { ResponsiveContainer, ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { Badge } from "@/components/ui/badge";
import { useGradeAnalysis } from "@/contexts/GradeAnalysisContext";
import { calculateBoxPlotData, groupBy, type BoxPlotData } from "@/components/analysis/services/calculationUtils";
import { formatBoxPlotDataForNivo } from "@/components/analysis/services/chartUtils";

// ============================================================================
// 类型定义
// ============================================================================

interface ClassBoxPlotChartProps {
  /** 考试ID（可选） */
  examId?: string;
  /** 自定义样式类名 */
  className?: string;
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

// 自定义箱线图组件
const BoxPlot = (props: any) => {
  const { x, y, width, height, payload, fill } = props;
  const data = payload || {};
  
  const max = Math.min(data.max || 0, 100);
  const min = Math.max(data.min || 0, 0);
  const q1 = Math.min(Math.max(data.q1 || 0, min), max);
  const q3 = Math.min(Math.max(data.q3 || 0, q1), max);
  const median = Math.min(Math.max(data.median || 0, min), max);
  const mean = Math.min(Math.max(data.mean || 0, min), max);
  
  const getYPosition = (value: number) => y + height - (height * value / 100);
  const strokeWidth = 2;

  return (
    <>
      {/* 最小值到最大值的垂直线 */}
      <line
        stroke="#666"
        strokeWidth={strokeWidth}
        strokeDasharray="3 3"
        x1={x + width / 2}
        y1={getYPosition(min)}
        x2={x + width / 2}
        y2={getYPosition(max)}
      />
      
      {/* 箱体 */}
      <rect
        fill={fill || "#3B82F6"}
        opacity={0.6}
        x={x + width * 0.25}
        y={getYPosition(q3)}
        width={width * 0.5}
        height={getYPosition(q1) - getYPosition(q3)}
      />
      
      {/* 中位数线 */}
      <line
        stroke="#333"
        strokeWidth={strokeWidth + 1}
        x1={x + width * 0.25}
        y1={getYPosition(median)}
        x2={x + width * 0.75}
        y2={getYPosition(median)}
      />
      
      {/* 最小值横线 */}
      <line
        stroke="#666"
        strokeWidth={strokeWidth}
        x1={x + width * 0.35}
        y1={getYPosition(min)}
        x2={x + width * 0.65}
        y2={getYPosition(min)}
      />
      
      {/* 最大值横线 */}
      <line
        stroke="#666"
        strokeWidth={strokeWidth}
        x1={x + width * 0.35}
        y1={getYPosition(max)}
        x2={x + width * 0.65}
        y2={getYPosition(max)}
      />
      
      {/* 平均值点 */}
      <circle
        fill="red"
        cx={x + width * 0.5}
        cy={getYPosition(mean)}
        r={3}
      />
    </>
  );
};

// 自定义提示框
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-4 border shadow-md rounded-md">
        <p className="font-bold">{data.subject}</p>
        <p>最小值: {data.min}</p>
        <p>第一四分位数 (Q1): {data.q1}</p>
        <p>中位数: {data.median}</p>
        <p>第三四分位数 (Q3): {data.q3}</p>
        <p>最大值: {data.max}</p>
        <p className="text-red-500">平均值: {data.mean.toFixed(1)}</p>
        {data.outliers && data.outliers.length > 0 && (
          <div className="mt-2">
            <p className="font-semibold">异常值 ({data.outliers.length}):</p>
            <ul className="pl-4 text-sm text-gray-600">
              {data.outliers.slice(0, 5).map((outlier: any, index: number) => (
                <li key={index}>
                  {outlier.studentName}: {outlier.value}分
                </li>
              ))}
              {data.outliers.length > 5 && <li>...还有{data.outliers.length - 5}个</li>}
            </ul>
          </div>
        )}
      </div>
    );
  }
  return null;
};

// ============================================================================
// 主组件
// ============================================================================

const ClassBoxPlotChart: React.FC<ClassBoxPlotChartProps> = ({ 
  examId, 
  className = "" 
}) => {
  const { selectedExam, gradeData, isLoading } = useGradeAnalysis();
  const [selectedClass, setSelectedClass] = useState<string>('all');

  // 确定要分析的考试ID
  const analysisExamId = examId || selectedExam?.id;

  // 获取可用班级列表
  const availableClasses = useMemo(() => {
    if (!gradeData || gradeData.length === 0) return [];
    
    const classes = new Set<string>();
    gradeData.forEach(record => {
      if (record.class_name && record.class_name.trim()) {
        classes.add(record.class_name.trim());
      }
    });
    
    const classArray = Array.from(classes).sort();
    return [
      { value: 'all', label: '全部班级对比' },
      ...classArray.map(c => ({ value: c, label: c }))
    ];
  }, [gradeData]);

  // 处理箱线图数据
  const boxPlotData = useMemo((): ProcessedBoxPlotData[] => {
    if (!gradeData || gradeData.length === 0) return [];

    // 根据选择的班级过滤数据
    let filteredData = gradeData;
    if (selectedClass !== 'all') {
      filteredData = gradeData.filter(record => record.class_name === selectedClass);
    }

    // 按科目分组
    const subjectGroups = groupBy(filteredData, record => record.subject || '未知科目');

    return Object.entries(subjectGroups).map(([subject, records]) => {
      // 提取有效分数
      const scores = records
        .map(r => r.score)
        .filter((score): score is number => typeof score === 'number' && !isNaN(score));

      if (scores.length === 0) {
        return {
          subject,
          min: 0,
          max: 0,
          median: 0,
          q1: 0,
          q3: 0,
          mean: 0,
          outliers: []
        };
      }

      // 计算箱线图数据
      const boxData = calculateBoxPlotData(scores);
      
      // 计算异常值（超出1.5倍IQR的值）
      const iqr = boxData.q3 - boxData.q1;
      const lowerBound = boxData.q1 - 1.5 * iqr;
      const upperBound = boxData.q3 + 1.5 * iqr;
      
      const outliers = records
        .filter(record => {
          const score = record.score;
          return typeof score === 'number' && !isNaN(score) && 
                 (score < lowerBound || score > upperBound);
        })
        .map(record => ({
          value: record.score as number,
          studentName: record.name || record.student_id,
          studentId: record.student_id
        }));

      return {
        subject,
        min: boxData.min,
        max: boxData.max,
        median: boxData.median,
        q1: boxData.q1,
        q3: boxData.q3,
        mean: scores.reduce((sum, score) => sum + score, 0) / scores.length,
        outliers
      };
    }).filter(data => data.min > 0 || data.max > 0); // 过滤掉无效数据
  }, [gradeData, selectedClass]);

  // 加载状态
  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">正在加载箱线图数据...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 无数据状态
  if (availableClasses.length <= 1) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>班级成绩箱线图</CardTitle>
          <CardDescription>分析各班级成绩分布情况</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-400 mr-3" />
              <div>
                <p className="text-sm text-yellow-700">
                  未找到班级数据，请检查：
                </p>
                <ul className="list-disc pl-5 mt-1 text-sm text-yellow-700">
                  <li>是否正确导入了成绩数据</li>
                  <li>导入时是否映射了班级字段</li>
                  <li>数据中是否包含班级信息</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 获取考试标题 - 兼容不同的字段名
  const examTitle = (selectedExam as any)?.title || (selectedExam as any)?.exam_title || '当前考试';

  return (
    <div className={`space-y-6 ${className}`}>
      
      {/* 控制面板 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">班级成绩箱线图</CardTitle>
              {selectedExam && (
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
                  {availableClasses.map(cls => (
                    <SelectItem key={cls.value} value={cls.value}>
                      {cls.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* 导出按钮 */}
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                导出
              </Button>
            </div>
          </div>
          <CardDescription>
            {selectedClass === 'all' 
              ? `显示全部${availableClasses.length - 1}个班级的成绩分布对比`
              : `显示${selectedClass}班级的各科目成绩分布`
            }
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
            <div className="h-96">
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
                  <YAxis 
                    domain={[0, 100]}
                    tick={{ fontSize: 12 }}
                  />
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

      {/* 统计摘要 */}
      {boxPlotData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">统计摘要</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {boxPlotData.map((data, index) => (
                <div key={data.subject} className="p-4 border rounded-lg bg-gray-50">
                  <h4 className="font-semibold text-gray-900 mb-2">{data.subject}</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">平均分:</span>
                      <span className="font-medium">{data.mean.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">中位数:</span>
                      <span className="font-medium">{data.median}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">分数范围:</span>
                      <span className="font-medium">{data.min} - {data.max}</span>
                    </div>
                    {data.outliers.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">异常值:</span>
                        <span className="font-medium text-orange-600">{data.outliers.length}个</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClassBoxPlotChart; 