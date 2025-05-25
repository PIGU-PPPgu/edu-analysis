import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Download, RefreshCw } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Line,
  Rectangle,
  ReferenceLine,
  ErrorBar,
  Label
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle } from "lucide-react";

// 类型定义，用于rpc调用返回值
interface ClassNameRecord {
  class_name: string;
}

// 箱线图数据类型
interface BoxPlotData {
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

interface ClassBoxPlotChartProps {
  examId?: string;
}

// 自定义箱线图组件
const BoxPlot = (props: any) => {
  const { 
    x, y, width, height, 
    payload, 
    dataKey,
    fill
  } = props;

  // 从payload中获取箱线图所需的所有数据
  const data = payload || {};
  
  // 检查数据有效性并设置默认值
  const max = Math.min(typeof data.max === 'number' ? data.max : 0, 100); // 确保最高不超过100
  const min = Math.max(typeof data.min === 'number' ? data.min : 0, 0);   // 确保最低不低于0
  const q1 = Math.min(Math.max(typeof data.q1 === 'number' ? data.q1 : 0, min), max);
  const q3 = Math.min(Math.max(typeof data.q3 === 'number' ? data.q3 : 0, q1), max);
  const median = Math.min(Math.max(typeof data.median === 'number' ? data.median : 0, min), max);
  const mean = Math.min(Math.max(typeof data.mean === 'number' ? data.mean : 0, min), max);
  const subject = typeof data.subject === 'string' ? data.subject : '';
  
  console.log("BoxPlot组件渲染:", { x, y, width, height, subject, min, max, median, q1, q3, mean });

  // 计算值在图表中的实际像素位置
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
        fill={fill || "#8884d8"}
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
      {mean > 0 && (
        <circle
          fill="red"
          cx={x + width * 0.5}
          cy={getYPosition(mean)}
          r={3}
        />
      )}
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
              {data.outliers.map((outlier: any, index: number) => (
                <li key={index}>
                  {outlier.studentName}: {outlier.value}分
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }
  return null;
};

// 班级选项为空时的警告组件
const EmptyClassWarning = () => (
  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 my-4">
    <div className="flex items-center">
      <div className="flex-shrink-0">
        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      </div>
      <div className="ml-3">
        <p className="text-sm text-yellow-700">
          未找到班级数据，请检查：
          <ul className="list-disc pl-5 mt-1">
            <li>是否正确导入了成绩数据</li>
            <li>导入时是否映射了班级字段</li>
            <li>数据中是否包含班级信息</li>
          </ul>
        </p>
      </div>
    </div>
  </div>
);

const ClassBoxPlotChart: React.FC<ClassBoxPlotChartProps> = ({ examId }) => {
  const [boxPlotData, setBoxPlotData] = useState<BoxPlotData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [classOptions, setClassOptions] = useState<{value: string, label: string}[]>([]);
  
  // 添加刷新状态
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setIsRefreshing(true);
    
    try {
      // 调用API获取数据
      const { data, error } = await supabase.functions.invoke('get-class-boxplot-data', {
        body: { exam_id: examId, class_name: selectedClass }
      });
      
      if (error) {
        console.error('获取箱线图数据失败:', error);
        setError('获取数据失败，请稍后再试');
        return;
      }
      
      if (!data || !data.boxplot_data || data.boxplot_data.length === 0) {
        setError('未找到班级成绩数据');
        setBoxPlotData([]);
        return;
      }
      
      // 处理获取到的数据
      setBoxPlotData(data.boxplot_data);
      
      // 如果有班级选项数据，更新班级选择器
      if (data.class_options && data.class_options.length > 0) {
        setClassOptions(data.class_options.map((c: ClassNameRecord) => ({
          value: c.class_name,
          label: c.class_name
        })));
        
        // 如果尚未选择班级，设置第一个为默认选项
        if (!selectedClass && data.class_options.length > 0) {
          setSelectedClass(data.class_options[0].class_name);
        }
      }
    } catch (err) {
      console.error('获取班级成绩统计数据失败:', err);
      setError('获取数据时出错');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };
  
  // 初次加载和examId变化时获取数据
  useEffect(() => {
    if (examId) {
      fetchData();
    }
  }, [examId, selectedClass]);

  const handleClassChange = (value: string) => {
    setSelectedClass(value);
  };

  const handleRefreshData = () => {
    fetchData();
  };

  const handleExportData = () => {
    // 实际应用中应该导出为CSV或Excel
    console.log("导出箱线图数据", boxPlotData);
    alert("箱线图数据导出成功");
  };

  // 渲染组件
  return (
    <Card className="w-full h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg font-medium">班级成绩分布</CardTitle>
          <CardDescription>显示各科目成绩在班级中的分布情况</CardDescription>
        </div>
        <div className="flex items-center space-x-2">
          {classOptions.length > 0 && (
            <Select onValueChange={handleClassChange} value={selectedClass || undefined}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="选择班级" />
              </SelectTrigger>
              <SelectContent>
                {classOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          {/* 添加刷新按钮 */}
          <Button 
            variant="outline" 
            size="icon" 
            onClick={handleRefreshData}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
          
          <Button variant="outline" size="icon" onClick={handleExportData}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {loading && !isRefreshing ? (
          <div className="flex items-center justify-center h-60">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-60 text-center">
            <AlertTriangle className="h-10 w-10 text-amber-500 mb-4" />
            <p className="text-muted-foreground">{error}</p>
            {error === '未找到班级成绩数据' && (
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={handleRefreshData}
              >
                刷新数据
              </Button>
            )}
          </div>
        ) : boxPlotData.length === 0 ? (
          <EmptyClassWarning />
        ) : (
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={boxPlotData}
                margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="subject" />
                <YAxis domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {boxPlotData.map((subject, index) => (
                  <g key={subject.subject}>
                    <BoxPlot
                      subject={subject.subject}
                      min={subject.min}
                      max={subject.max}
                      median={subject.median}
                      q1={subject.q1}
                      q3={subject.q3}
                      fill={`#${Math.floor(Math.random()*16777215).toString(16)}`}
                      x={index}
                      outliers={subject.outliers}
                    />
                  </g>
                ))}
                <Line
                  dataKey="mean"
                  stroke="#ff7300"
                  name="班级平均分"
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  strokeWidth={2}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClassBoxPlotChart; 